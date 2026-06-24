import express from 'express';
import { z } from 'zod';
import { RateLimiterMemory } from 'rate-limiter-flexible';

const router = express.Router();

/**
 * Strict rate limiter for the feedback -> GitHub proxy (abuse/spam vector).
 * 5 submissions per minute per IP.
 */
const feedbackRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

// Validation schema: feedback is required (non-empty after trim, capped),
// email is optional but must be a valid address if provided.
const feedbackSchema = z.object({
  feedback: z
    .string({ required_error: 'Feedback text is required' })
    .trim()
    .min(1, 'Feedback text is required')
    .max(5000, 'Feedback must be 5000 characters or fewer'),
  email: z.string().trim().email('Invalid email address').max(254).optional(),
});

// Submit feedback as a GitHub issue
router.post('/', async (req, res) => {
  try {
    // Per-IP rate limit before doing any outbound GitHub work
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    try {
      await feedbackRateLimiter.consume(key);
    } catch {
      return res.status(429).json({
        message: 'Too many feedback submissions. Please try again later.',
      });
    }

    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.errors[0]?.message || 'Invalid feedback payload',
      });
    }

    const { feedback, email } = parsed.data;

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = 'THuynh-91/custom_wordle';

    if (!GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN not configured');
      return res.status(500).json({ message: 'Feedback system not configured' });
    }

    // Get the next issue number by fetching existing issues
    let issueNumber = 1;
    try {
      const issuesResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues?labels=feedback&state=all&per_page=100`, {
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AI-Wordle-Duel-Feedback'
        }
      });
      if (issuesResponse.ok) {
        const issues = await issuesResponse.json() as any[];
        issueNumber = issues.length + 1;
      }
    } catch (error) {
      console.log('Could not fetch issue count, using default');
    }

    // Create issue title
    const title = `Feedback #${issueNumber}`;

    // Create issue body
    let body = feedback;
    body += `\n\n---\n**Email:** ${email || 'N/A'}`;

    // Submit to GitHub Issues API
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Wordle-Duel-Feedback'
      },
      body: JSON.stringify({
        title,
        body,
        labels: ['feedback']
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub API error:', errorData);
      throw new Error('Failed to submit feedback to GitHub');
    }

    const issue = await response.json() as { number: number; html_url: string };
    console.log(`Feedback submitted as issue #${issue.number}`);

    res.json({
      success: true,
      message: 'Thank you for your feedback!',
      issueNumber: issue.number
    });

  } catch (error: any) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      message: 'Failed to submit feedback. Please try again later.'
    });
  }
});

export default router;
