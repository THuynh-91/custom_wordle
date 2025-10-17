import express from 'express';

const router = express.Router();

interface FeedbackRequest {
  feedback: string;
  email?: string;
}

// Submit feedback as a GitHub issue
router.post('/', async (req, res) => {
  try {
    const { feedback, email }: FeedbackRequest = req.body;

    if (!feedback || feedback.trim().length === 0) {
      return res.status(400).json({ message: 'Feedback text is required' });
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const GITHUB_REPO = 'THuynh-91/custom_wordle';

    if (!GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN not configured');
      return res.status(500).json({ message: 'Feedback system not configured' });
    }

    // Create issue title
    const title = `User Feedback: ${feedback.substring(0, 50)}${feedback.length > 50 ? '...' : ''}`;

    // Create issue body
    let body = `## User Feedback\n\n${feedback}`;
    if (email) {
      body += `\n\n---\n**Contact:** ${email}`;
    }
    body += `\n\n---\n*Submitted: ${new Date().toISOString()}*`;

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

    const issue = await response.json();
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
