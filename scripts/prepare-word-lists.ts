/**
 * Script to prepare word lists for different lengths
 * This generates curated word lists for 3-7 letter words
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const WORDS_DIR = path.join(DATA_DIR, 'words');
const FREQ_DIR = path.join(DATA_DIR, 'frequencies');

// Ensure directories exist
[DATA_DIR, WORDS_DIR, FREQ_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Common English words by length (curated lists for production)
const WORD_LISTS: Record<number, { answer: string[], guess: string[] }> = {
  3: {
    answer: [
      'ace', 'act', 'add', 'age', 'ago', 'aid', 'aim', 'air', 'all', 'and',
      'ant', 'any', 'ape', 'arc', 'are', 'ark', 'arm', 'art', 'ash', 'ask',
      'ate', 'awe', 'axe', 'aye', 'bad', 'bag', 'ban', 'bar', 'bat', 'bay',
      'bed', 'bee', 'beg', 'bet', 'bid', 'big', 'bin', 'bit', 'bow', 'box',
      'boy', 'bud', 'bug', 'bum', 'bun', 'bus', 'but', 'buy', 'cab', 'can',
      'cap', 'car', 'cat', 'cob', 'cod', 'cog', 'cop', 'cot', 'cow', 'cry',
      'cub', 'cud', 'cue', 'cup', 'cut', 'dad', 'dam', 'day', 'den', 'dew',
      'did', 'die', 'dig', 'dim', 'dip', 'doc', 'doe', 'dog', 'dot', 'dry',
      'dub', 'dud', 'due', 'dug', 'dye', 'ear', 'eat', 'ebb', 'eel', 'egg',
      'ego', 'elf', 'elk', 'elm', 'emu', 'end', 'era', 'eve', 'ewe', 'eye',
      'fab', 'fad', 'fan', 'far', 'fat', 'fax', 'fed', 'fee', 'few', 'fib',
      'fig', 'fin', 'fir', 'fit', 'fix', 'flu', 'fly', 'foe', 'fog', 'for',
      'fox', 'fry', 'fun', 'fur', 'gab', 'gag', 'gap', 'gas', 'gay', 'gel',
      'gem', 'get', 'gig', 'gin', 'god', 'got', 'gum', 'gun', 'gut', 'guy',
      'gym', 'had', 'hag', 'ham', 'has', 'hat', 'hay', 'hem', 'hen', 'her',
      'hew', 'hex', 'hey', 'hid', 'him', 'hip', 'his', 'hit', 'hog', 'hop',
      'hot', 'how', 'hub', 'hue', 'hug', 'hum', 'hut', 'ice', 'icy', 'ill',
      'imp', 'ink', 'inn', 'ion', 'irk', 'its', 'ivy', 'jab', 'jag', 'jam',
      'jar', 'jaw', 'jay', 'jet', 'jig', 'job', 'jog', 'jot', 'joy', 'jug',
      'keg', 'ken', 'key', 'kid', 'kin', 'kit', 'lab', 'lac', 'lad', 'lag',
      'lap', 'law', 'lax', 'lay', 'lea', 'led', 'leg', 'let', 'lid', 'lie',
      'lip', 'lit', 'log', 'lot', 'low', 'lug', 'mac', 'mad', 'man', 'map',
      'mar', 'mat', 'max', 'may', 'men', 'met', 'mid', 'mix', 'mob', 'mod',
      'mom', 'mop', 'mow', 'mud', 'mug', 'nab', 'nag', 'nap', 'nay', 'net',
      'new', 'nil', 'nip', 'nit', 'nod', 'nor', 'not', 'now', 'nub', 'nun',
      'nut', 'oak', 'oar', 'oat', 'odd', 'ode', 'off', 'oft', 'oil', 'old',
      'one', 'opt', 'orb', 'ore', 'our', 'out', 'owe', 'owl', 'own', 'pad',
      'pal', 'pan', 'par', 'pat', 'paw', 'pay', 'pea', 'peg', 'pen', 'pep',
      'per', 'pet', 'pew', 'pie', 'pig', 'pin', 'pit', 'ply', 'pod', 'pop',
      'pot', 'pox', 'pro', 'pry', 'pub', 'pug', 'pun', 'pup', 'put', 'rag',
      'ram', 'ran', 'rap', 'rat', 'raw', 'ray', 'red', 'ref', 'rev', 'rib',
      'rid', 'rig', 'rim', 'rip', 'rob', 'rod', 'roe', 'rot', 'row', 'rub',
      'rug', 'rum', 'run', 'rut', 'rye', 'sac', 'sad', 'sag', 'sap', 'sat',
      'saw', 'say', 'sea', 'set', 'sew', 'she', 'shy', 'sin', 'sip', 'sir',
      'sis', 'sit', 'six', 'ski', 'sky', 'sly', 'sob', 'sod', 'son', 'sop',
      'sot', 'sow', 'soy', 'spa', 'spy', 'sty', 'sub', 'sud', 'sum', 'sun',
      'sup', 'tab', 'tad', 'tag', 'tan', 'tap', 'tar', 'tat', 'tax', 'tea',
      'ted', 'ten', 'the', 'thy', 'tic', 'tie', 'tin', 'tip', 'tit', 'toe',
      'tog', 'ton', 'too', 'top', 'tot', 'tow', 'toy', 'try', 'tub', 'tug',
      'two', 'ugh', 'ump', 'urn', 'use', 'van', 'var', 'vat', 'vet', 'via',
      'vie', 'vow', 'wad', 'wag', 'war', 'was', 'wax', 'way', 'web', 'wed',
      'wee', 'wet', 'who', 'why', 'wig', 'win', 'wit', 'woe', 'wok', 'won',
      'woo', 'wow', 'yak', 'yam', 'yap', 'yaw', 'yea', 'yen', 'yes', 'yet',
      'yew', 'yin', 'you', 'yow', 'zap', 'zen', 'zip', 'zit', 'zoo'
    ],
    guess: [] // Will be populated with answer + additional valid words
  },
  4: {
    answer: [
      'able', 'acid', 'aged', 'also', 'area', 'army', 'away', 'baby', 'back', 'ball',
      'band', 'bank', 'base', 'bath', 'bear', 'beat', 'been', 'beer', 'bell', 'belt',
      'best', 'bill', 'bird', 'blow', 'blue', 'boat', 'body', 'bomb', 'bond', 'bone',
      'book', 'boom', 'born', 'boss', 'both', 'bowl', 'bulk', 'burn', 'bush', 'busy',
      'call', 'calm', 'came', 'camp', 'card', 'care', 'case', 'cash', 'cast', 'cell',
      'chat', 'chef', 'chip', 'city', 'clay', 'club', 'coal', 'coat', 'code', 'cold',
      'come', 'cook', 'cool', 'cope', 'copy', 'core', 'corn', 'cost', 'coup', 'cove',
      'crew', 'crop', 'dark', 'data', 'date', 'dawn', 'days', 'dead', 'deal', 'dean',
      'dear', 'debt', 'deep', 'deny', 'desk', 'diet', 'disc', 'disk', 'dock', 'does',
      'done', 'door', 'dose', 'down', 'draw', 'drew', 'drop', 'drug', 'drum', 'dual',
      'duck', 'dull', 'dump', 'dust', 'duty', 'each', 'earl', 'earn', 'ease', 'east',
      'easy', 'echo', 'edge', 'else', 'even', 'ever', 'evil', 'exam', 'exit', 'face',
      'fact', 'fail', 'fair', 'fall', 'farm', 'fast', 'fate', 'fear', 'feed', 'feel',
      'feet', 'fell', 'felt', 'file', 'fill', 'film', 'find', 'fine', 'fire', 'firm',
      'fish', 'five', 'flag', 'flat', 'fled', 'flee', 'flew', 'flow', 'folk', 'food',
      'foot', 'ford', 'form', 'fort', 'foul', 'four', 'free', 'from', 'fuel', 'full',
      'fund', 'gain', 'game', 'gang', 'gate', 'gave', 'gear', 'gene', 'gift', 'girl',
      'give', 'glad', 'glow', 'goal', 'goat', 'goes', 'gold', 'golf', 'gone', 'good',
      'grab', 'gray', 'grew', 'grey', 'grip', 'grow', 'gulf', 'hair', 'half', 'hall',
      'hand', 'hang', 'hard', 'harm', 'hate', 'have', 'head', 'hear', 'heat', 'heel',
      'held', 'hell', 'help', 'here', 'hero', 'hide', 'high', 'hill', 'hire', 'hold',
      'hole', 'holy', 'home', 'hope', 'horn', 'host', 'hour', 'huge', 'hung', 'hunt',
      'hurt', 'idea', 'inch', 'into', 'iron', 'item', 'jack', 'jane', 'jean', 'john',
      'join', 'joke', 'jump', 'june', 'jury', 'just', 'keen', 'keep', 'kept', 'kick',
      'kill', 'kind', 'king', 'kiss', 'knee', 'knew', 'know', 'lack', 'lady', 'laid',
      'lake', 'land', 'lane', 'last', 'late', 'lead', 'lean', 'leap', 'left', 'lend',
      'lens', 'less', 'life', 'lift', 'like', 'line', 'link', 'lion', 'list', 'live',
      'load', 'loan', 'lock', 'long', 'look', 'loop', 'lord', 'lose', 'loss', 'lost',
      'loud', 'love', 'luck', 'lung', 'made', 'mail', 'main', 'make', 'male', 'mall',
      'many', 'mark', 'mass', 'mate', 'math', 'meal', 'mean', 'meat', 'meet', 'menu',
      'mere', 'mesh', 'mile', 'milk', 'mill', 'mind', 'mine', 'miss', 'mode', 'mood',
      'moon', 'more', 'most', 'move', 'much', 'must', 'myth', 'name', 'navy', 'near',
      'neat', 'neck', 'need', 'news', 'next', 'nice', 'nick', 'nine', 'none', 'nose',
      'note', 'okay', 'once', 'only', 'onto', 'open', 'oral', 'over', 'pace', 'pack',
      'page', 'paid', 'pain', 'pair', 'pale', 'palm', 'park', 'part', 'pass', 'past',
      'path', 'peak', 'pick', 'pile', 'pine', 'pink', 'pipe', 'plan', 'play', 'plot',
      'plug', 'plus', 'poem', 'poet', 'pole', 'poll', 'pond', 'pool', 'poor', 'pope',
      'port', 'pose', 'post', 'pour', 'pray', 'pull', 'pure', 'push', 'race', 'rail',
      'rain', 'rank', 'rare', 'rate', 'read', 'real', 'rear', 'rely', 'rent', 'rest',
      'rice', 'rich', 'ride', 'ring', 'rise', 'risk', 'road', 'rock', 'rode', 'role',
      'roll', 'roof', 'room', 'root', 'rope', 'rose', 'rout', 'rule', 'rush', 'ruth',
      'safe', 'said', 'sake', 'sale', 'salt', 'same', 'sand', 'sang', 'sank', 'save',
      'seat', 'seed', 'seek', 'seem', 'seen', 'self', 'sell', 'send', 'sent', 'sept',
      'ship', 'shop', 'shot', 'show', 'shut', 'sick', 'side', 'sign', 'sing', 'sink',
      'site', 'size', 'skin', 'slip', 'slow', 'snow', 'soft', 'soil', 'sold', 'sole',
      'some', 'song', 'soon', 'sort', 'soul', 'spot', 'star', 'stay', 'step', 'stop',
      'such', 'suit', 'sure', 'take', 'tale', 'talk', 'tall', 'tank', 'tape', 'task',
      'team', 'tear', 'tell', 'tend', 'term', 'test', 'text', 'than', 'that', 'thee',
      'them', 'then', 'they', 'thin', 'this', 'thou', 'thus', 'tide', 'tied', 'tier',
      'time', 'tiny', 'tone', 'took', 'tool', 'tore', 'torn', 'toss', 'tour', 'town',
      'tree', 'trip', 'true', 'tune', 'turn', 'twin', 'type', 'unit', 'upon', 'used',
      'user', 'vary', 'vast', 'very', 'vice', 'view', 'vote', 'wage', 'wait', 'wake',
      'walk', 'wall', 'want', 'ward', 'warm', 'warn', 'wash', 'wave', 'ways', 'weak',
      'wear', 'week', 'well', 'went', 'were', 'west', 'what', 'when', 'whom', 'wide',
      'wife', 'wild', 'will', 'wind', 'wine', 'wing', 'wire', 'wise', 'wish', 'with',
      'wood', 'word', 'wore', 'work', 'worm', 'worn', 'wrap', 'yard', 'yeah', 'year',
      'your', 'zero', 'zone'
    ],
    guess: []
  },
  5: {
    answer: [
      'about', 'above', 'abuse', 'actor', 'acute', 'admit', 'adopt', 'adult', 'after', 'again',
      'agent', 'agree', 'ahead', 'alarm', 'album', 'alert', 'alike', 'alive', 'allow', 'alone',
      'along', 'alter', 'among', 'anger', 'angle', 'angry', 'apart', 'apple', 'apply', 'arena',
      'argue', 'arise', 'array', 'aside', 'asset', 'audio', 'audit', 'avoid', 'award', 'aware',
      'badly', 'baker', 'bases', 'basic', 'basis', 'beach', 'began', 'begin', 'being', 'below',
      'bench', 'billy', 'birth', 'black', 'blame', 'blind', 'block', 'blood', 'board', 'boost',
      'booth', 'bound', 'brain', 'brand', 'bread', 'break', 'breed', 'brief', 'bring', 'broad',
      'broke', 'brown', 'build', 'built', 'buyer', 'cable', 'calif', 'carry', 'catch', 'cause',
      'chain', 'chair', 'chart', 'chase', 'cheap', 'check', 'chest', 'chief', 'child', 'china',
      'chose', 'civil', 'claim', 'class', 'clean', 'clear', 'click', 'clock', 'close', 'coach',
      'coast', 'could', 'count', 'court', 'cover', 'craft', 'crash', 'crazy', 'cream', 'crime',
      'cross', 'crowd', 'crown', 'crude', 'cycle', 'daily', 'dance', 'dated', 'dealt', 'death',
      'debut', 'delay', 'depth', 'doing', 'doubt', 'dozen', 'draft', 'drama', 'drank', 'drawn',
      'dream', 'dress', 'drill', 'drink', 'drive', 'drove', 'dying', 'eager', 'early', 'earth',
      'eight', 'elite', 'empty', 'enemy', 'enjoy', 'enter', 'entry', 'equal', 'error', 'event',
      'every', 'exact', 'exist', 'extra', 'faith', 'false', 'fault', 'fiber', 'field', 'fifth',
      'fifty', 'fight', 'final', 'first', 'fixed', 'flash', 'fleet', 'floor', 'fluid', 'focus',
      'force', 'forth', 'forty', 'forum', 'found', 'frame', 'frank', 'fraud', 'fresh', 'front',
      'fruit', 'fully', 'funny', 'giant', 'given', 'glass', 'globe', 'going', 'grace', 'grade',
      'grand', 'grant', 'grass', 'great', 'green', 'gross', 'group', 'grown', 'guard', 'guess',
      'guest', 'guide', 'happy', 'harry', 'heart', 'heavy', 'hence', 'henry', 'horse', 'hotel',
      'house', 'human', 'ideal', 'image', 'imply', 'index', 'inner', 'input', 'issue', 'japan',
      'jimmy', 'joint', 'jones', 'judge', 'known', 'label', 'large', 'laser', 'later', 'laugh',
      'layer', 'learn', 'lease', 'least', 'leave', 'legal', 'lemon', 'level', 'lewis', 'light',
      'limit', 'links', 'lives', 'local', 'logic', 'loose', 'lower', 'lucky', 'lunch', 'lying',
      'magic', 'major', 'maker', 'march', 'maria', 'match', 'maybe', 'mayor', 'meant', 'media',
      'metal', 'might', 'minor', 'minus', 'mixed', 'model', 'money', 'month', 'moral', 'motor',
      'mount', 'mouse', 'mouth', 'movie', 'music', 'needs', 'never', 'newly', 'night', 'noise',
      'north', 'noted', 'novel', 'nurse', 'occur', 'ocean', 'offer', 'often', 'order', 'other',
      'ought', 'paint', 'panel', 'panic', 'paper', 'paris', 'party', 'pause', 'peace', 'peter',
      'phase', 'phone', 'photo', 'piece', 'pilot', 'pitch', 'place', 'plain', 'plane', 'plant',
      'plate', 'point', 'pound', 'power', 'press', 'price', 'pride', 'prime', 'print', 'prior',
      'prize', 'proof', 'proud', 'prove', 'queen', 'quick', 'quiet', 'quite', 'radio', 'raise',
      'range', 'rapid', 'ratio', 'reach', 'ready', 'refer', 'right', 'rival', 'river', 'robin',
      'roger', 'roman', 'rough', 'round', 'route', 'royal', 'rural', 'scale', 'scene', 'scope',
      'score', 'sense', 'serve', 'seven', 'shall', 'shape', 'share', 'sharp', 'sheet', 'shelf',
      'shell', 'shift', 'shine', 'shirt', 'shock', 'shoot', 'short', 'shown', 'sight', 'since',
      'sixth', 'sixty', 'sized', 'skill', 'sleep', 'slide', 'small', 'smart', 'smile', 'smith',
      'smoke', 'solid', 'solve', 'sorry', 'sound', 'south', 'space', 'spare', 'speak', 'speed',
      'spend', 'spent', 'split', 'spoke', 'sport', 'staff', 'stage', 'stake', 'stand', 'start',
      'state', 'steam', 'steel', 'stick', 'still', 'stock', 'stone', 'stood', 'store', 'storm',
      'story', 'strip', 'stuck', 'study', 'stuff', 'style', 'sugar', 'suite', 'super', 'sweet',
      'table', 'taken', 'taste', 'taxes', 'teach', 'terry', 'texas', 'thank', 'theft', 'their',
      'theme', 'there', 'these', 'thick', 'thing', 'think', 'third', 'those', 'three', 'threw',
      'throw', 'tight', 'times', 'title', 'today', 'topic', 'total', 'touch', 'tough', 'tower',
      'track', 'trade', 'train', 'treat', 'trend', 'trial', 'tribe', 'trick', 'tried', 'tries',
      'troop', 'truck', 'truly', 'trust', 'truth', 'twice', 'under', 'undue', 'union', 'unity',
      'until', 'upper', 'upset', 'urban', 'usage', 'usual', 'valid', 'value', 'video', 'virus',
      'visit', 'vital', 'vocal', 'voice', 'waste', 'watch', 'water', 'wheel', 'where', 'which',
      'while', 'white', 'whole', 'whose', 'woman', 'women', 'world', 'worry', 'worse', 'worst',
      'worth', 'would', 'wound', 'write', 'wrong', 'wrote', 'young', 'youth'
    ],
    guess: []
  },
  6: {
    answer: [
      'accept', 'access', 'accord', 'account', 'across', 'action', 'active', 'actual', 'advice',
      'affect', 'afford', 'afraid', 'agency', 'agenda', 'almost', 'already', 'always', 'amount',
      'animal', 'annual', 'answer', 'anyone', 'anyway', 'appeal', 'appear', 'around', 'arrive',
      'artist', 'aspect', 'assert', 'assess', 'assign', 'assist', 'assume', 'assure', 'attach',
      'attack', 'attend', 'august', 'author', 'avenue', 'backed', 'barely', 'battle', 'beauty',
      'became', 'become', 'before', 'behalf', 'behind', 'belief', 'belong', 'benefit', 'better',
      'between', 'beyond', 'bishop', 'border', 'bottle', 'bottom', 'bought', 'branch', 'breach',
      'bridge', 'brief', 'bright', 'broken', 'budget', 'burden', 'bureau', 'button', 'camera',
      'cancer', 'cannot', 'carbon', 'career', 'castle', 'casual', 'caught', 'center', 'centre',
      'century', 'chance', 'change', 'charge', 'choice', 'choose', 'chosen', 'church', 'circle',
      'client', 'closed', 'closer', 'coffee', 'column', 'combat', 'coming', 'common', 'comply',
      'confirm', 'cope', 'corner', 'county', 'couple', 'course', 'covers', 'create', 'credit',
      'crisis', 'custom', 'damage', 'danger', 'dealer', 'debate', 'decade', 'decide', 'defeat',
      'defend', 'define', 'degree', 'demand', 'depend', 'deputy', 'derive', 'desert', 'design',
      'desire', 'detail', 'detect', 'device', 'differ', 'digital', 'dinner', 'direct', 'doctor',
      'dollar', 'domain', 'double', 'driven', 'driver', 'during', 'easier', 'easily', 'eating',
      'economic', 'editor', 'effect', 'effort', 'eighth', 'either', 'eleven', 'emerge', 'empire',
      'employ', 'enable', 'ending', 'energy', 'engage', 'engine', 'enough', 'ensure', 'entire',
      'entity', 'equity', 'escape', 'estate', 'ethnic', 'europe', 'events', 'exceed', 'except',
      'excess', 'expand', 'expect', 'expert', 'export', 'expose', 'extend', 'extent', 'fabric',
      'faced', 'facility', 'factor', 'failed', 'fairly', 'fallen', 'family', 'famous', 'father',
      'fellow', 'female', 'figure', 'filing', 'finger', 'finish', 'fiscal', 'flight', 'flying',
      'follow', 'forbid', 'forced', 'forest', 'forget', 'formal', 'format', 'former', 'foster',
      'fought', 'fourth', 'French', 'friend', 'future', 'garden', 'gather', 'gender', 'general',
      'global', 'golden', 'grants', 'ground', 'growth', 'guilty', 'handed', 'handle', 'happen',
      'hardly', 'headed', 'health', 'height', 'helped', 'hidden', 'highly', 'holder', 'honest',
      'hughes', 'hungry', 'hunter', 'impact', 'import', 'impose', 'improve', 'income', 'indeed',
      'independent', 'indian', 'inform', 'injury', 'inside', 'insist', 'intend', 'intent', 'invest',
      'island', 'itself', 'jersey', 'joseph', 'junior', 'justice', 'killed', 'labour', 'latest',
      'latter', 'launch', 'lawyer', 'leader', 'league', 'legacy', 'legend', 'length', 'lesson',
      'letter', 'likely', 'linked', 'liquid', 'listen', 'little', 'living', 'locate', 'locked',
      'london', 'longer', 'looked', 'losing', 'lovely', 'luxury', 'mainly', 'making', 'manage',
      'manner', 'manual', 'margin', 'marine', 'marked', 'market', 'married', 'martin', 'master',
      'matter', 'mature', 'medium', 'member', 'memory', 'mental', 'merely', 'merged', 'method',
      'middle', 'mighty', 'miller', 'mining', 'minute', 'mirror', 'mobile', 'modern', 'modest',
      'modify', 'module', 'moment', 'morris', 'mostly', 'mother', 'motion', 'moving', 'murder',
      'museum', 'mutual', 'myself', 'narrow', 'nation', 'native', 'nature', 'nearby', 'nearly',
      'nelson', 'never', 'normal', 'notice', 'notion', 'number', 'object', 'obtain', 'occupy',
      'offset', 'online', 'option', 'orange', 'origin', 'output', 'oxford', 'packed', 'palace',
      'parent', 'partly', 'passed', 'patent', 'people', 'period', 'permit', 'person', 'phrase',
      'picked', 'planet', 'played', 'player', 'please', 'plenty', 'pocket', 'police', 'policy',
      'portal', 'posted', 'potato', 'pound', 'powers', 'prefer', 'pretty', 'priest', 'primary',
      'prince', 'prison', 'private', 'profit', 'proper', 'prove', 'public', 'pursue', 'pushed',
      'putting', 'racial', 'raised', 'random', 'rarely', 'rather', 'rating', 'reader', 'really',
      'reason', 'recall', 'recent', 'record', 'reduce', 'reform', 'refuse', 'regard', 'regime',
      'region', 'relate', 'relief', 'remain', 'remark', 'remedy', 'remote', 'remove', 'render',
      'repair', 'repeat', 'replace', 'reply', 'report', 'rescue', 'resort', 'result', 'retain',
      'return', 'reveal', 'review', 'reward', 'riding', 'rising', 'river', 'robert', 'robust',
      'ruling', 'sacred', 'safety', 'salary', 'sample', 'scheme', 'school', 'screen', 'search',
      'season', 'second', 'secret', 'sector', 'secure', 'seeing', 'seemed', 'select', 'seller',
      'senior', 'serial', 'series', 'served', 'server', 'settle', 'severe', 'sexual', 'should',
      'shower', 'signal', 'signed', 'silent', 'silver', 'similar', 'simple', 'simply', 'single',
      'sister', 'slight', 'smooth', 'social', 'solely', 'sought', 'source', 'soviet', 'speech',
      'spirit', 'spoken', 'spread', 'spring', 'square', 'stable', 'status', 'steady', 'stolen',
      'strain', 'strange', 'stream', 'street', 'stress', 'strict', 'strike', 'string', 'strong',
      'struck', 'studio', 'submit', 'sudden', 'suffer', 'summer', 'summit', 'sunday', 'supply',
      'surely', 'survey', 'switch', 'symbol', 'system', 'taking', 'talent', 'talking', 'target',
      'taught', 'tenant', 'tender', 'tennis', 'tenure', 'thanks', 'theatre', 'theory', 'thirty',
      'though', 'threat', 'thrown', 'ticket', 'timber', 'timing', 'tissue', 'toward', 'travel',
      'treaty', 'tribal', 'trying', 'tunnel', 'turkey', 'turned', 'twenty', 'unable', 'unique',
      'united', 'unless', 'unlike', 'update', 'useful', 'valley', 'varied', 'vastly', 'vector',
      'vendor', 'versus', 'vessel', 'victim', 'village', 'vision', 'visual', 'volume', 'walker',
      'walked', 'wanted', 'warden', 'warmly', 'warned', 'watson', 'wealth', 'weapon', 'weekly',
      'weight', 'wholly', 'widely', 'window', 'winner', 'winter', 'within', 'wonder', 'wooden',
      'worker', 'worked', 'wright', 'writer', 'yellow'
    ],
    guess: []
  },
  7: {
    answer: [
      'ability', 'absence', 'absolut', 'abstract', 'academy', 'account', 'accused', 'achieve',
      'acquire', 'address', 'advance', 'adverse', 'advised', 'adviser', 'advocate', 'aesthetic',
      'affected', 'african', 'against', 'alleged', 'already', 'альso', 'amended', 'ancient',
      'another', 'anxiety', 'anybody', 'applied', 'approve', 'arrival', 'article', 'artist',
      'assault', 'assumed', 'assured', 'attempt', 'attract', 'auction', 'average', 'backing',
      'balance', 'banking', 'barrier', 'battery', 'bearing', 'because', 'bedroom', 'believe',
      'beneath', 'benefit', 'besides', 'between', 'biggest', 'billion', 'binding', 'biology',
      'British', 'brother', 'brought', 'cabinet', 'caliber', 'calling', 'capable', 'capital',
      'captain', 'capture', 'careful', 'carrier', 'caution', 'ceiling', 'central', 'century',
      'certain', 'chairman', 'chamber', 'changed', 'channel', 'chapter', 'charity', 'charles',
      'charter', 'cheaper', 'checked', 'chicken', 'chinese', 'circuit', 'citizen', 'classic',
      'climate', 'closing', 'cluster', 'coastal', 'cocaine', 'collect', 'college', 'colonel',
      'combine', 'comfort', 'command', 'comment', 'commerce', 'compact', 'company', 'compare',
      'compete', 'complex', 'compose', 'concept', 'concern', 'concert', 'conclude', 'conduct',
      'confirm', 'conflict', 'congress', 'connect', 'consent', 'consist', 'console', 'consume',
      'contact', 'contain', 'content', 'contest', 'context', 'continue', 'contract', 'contrary',
      'control', 'convert', 'conviction', 'cooking', 'correct', 'council', 'counsel', 'counter',
      'country', 'coupled', 'courage', 'covered', 'created', 'creator', 'cricket', 'criminal',
      'critical', 'crystal', 'culture', 'curious', 'current', 'cutting', 'dealing', 'decided',
      'decline', 'default', 'defence', 'deficit', 'defined', 'deliver', 'density', 'deposit',
      'derived', 'descend', 'deserve', 'desired', 'desktop', 'despite', 'destroy', 'detailed',
      'detect', 'develop', 'devoted', 'diamond', 'digital', 'dignity', 'discuss', 'disease',
      'display', 'dispute', 'distant', 'distinct', 'diverse', 'divided', 'drawing', 'dropped',
      'drought', 'earlier', 'eastern', 'economy', 'edition', 'edward', 'elderly', 'elegant',
      'element', 'elevate', 'embrace', 'emerged', 'emperor', 'emphasis', 'empire', 'employed',
      'enabled', 'endorse', 'enforce', 'engaged', 'england', 'enhance', 'enormous', 'entered',
      'episode', 'equally', 'equation', 'escaped', 'essence', 'ethical', 'evening', 'evident',
      'exactly', 'examine', 'example', 'excited', 'exclude', 'execute', 'exhibit', 'existed',
      'explain', 'explore', 'exposed', 'express', 'extended', 'extent', 'external', 'extract',
      'extreme', 'factory', 'faculty', 'failing', 'failure', 'falling', 'fashion', 'feature',
      'federal', 'feeling', 'fiction', 'fifteen', 'fighting', 'filling', 'finance', 'finding',
      'fishing', 'fitness', 'fleming', 'flexible', 'focused', 'foreign', 'forever', 'formula',
      'fortune', 'forward', 'founded', 'founder', 'freedom', 'freight', 'frequent', 'friendly',
      'fulfill', 'funeral', 'further', 'gabriel', 'gallery', 'gambling', 'gateway', 'general',
      'genetic', 'genuine', 'getting', 'gilbert', 'glasgow', 'glimpse', 'globally', 'goddess',
      'granted', 'greater', 'greatly', 'grounds', 'growing', 'habitat', 'hanging', 'happens',
      'harbour', 'harmony', 'harvest', 'haven', 'heading', 'healthy', 'hearing', 'heavily',
      'helping', 'herself', 'highway', 'himself', 'history', 'holding', 'holland', 'holiday',
      'horizon', 'horizontal', 'hostile', 'housing', 'however', 'hundred', 'hunting', 'husband',
      'identity', 'illegal', 'illness', 'imagine', 'immigration', 'immune', 'impact', 'implied',
      'improve', 'include', 'incredible', 'incur', 'indian', 'indicate', 'induced', 'industry',
      'infant', 'infection', 'inflation', 'initial', 'injured', 'inquiry', 'insight', 'inspect',
      'install', 'instant', 'instead', 'intense', 'intent', 'interest', 'internal', 'interpret',
      'interval', 'intimate', 'involve', 'islamic', 'island', 'isolated', 'israeli', 'italian',
      'jacques', 'january', 'jealous', 'jeffrey', 'jewelry', 'johnson', 'joining', 'journal',
      'journey', 'judgment', 'justice', 'justify', 'keeping', 'kennedy', 'kitchen', 'knowing',
      'largely', 'lateral', 'laughed', 'launched', 'leading', 'learned', 'leaving', 'lecture',
      'leisure', 'lending', 'leonard', 'liberal', 'liberty', 'library', 'license', 'limited',
      'Lincoln', 'liquid', 'listing', 'literal', 'literary', 'loading', 'located', 'logical',
      'looking', 'loyalty', 'machine', 'magical', 'maintain', 'majority', 'managed', 'manager',
      'mandate', 'mankind', 'married', 'massive', 'matched', 'material', 'matthew', 'maximum',
      'measure', 'medical', 'meeting', 'mention', 'message', 'michael', 'midwest', 'military',
      'mineral', 'minimal', 'minimum', 'minister', 'minority', 'missing', 'mission', 'mistake',
      'mixture', 'moderate', 'modified', 'monitor', 'monthly', 'morning', 'mounted', 'musical',
      'mystery', 'namely', 'natural', 'nearest', 'neither', 'nervous', 'network', 'neutral',
      'nicolas', 'notable', 'nothing', 'noticed', 'nuclear', 'numerous', 'nursery', 'nursing',
      'obesity', 'obvious', 'occurred', 'offense', 'offered', 'officer', 'official', 'ongoing',
      'opening', 'operate', 'opinion', 'opposed', 'optical', 'optimum', 'organic', 'original',
      'outcome', 'outdoor', 'outlook', 'outside', 'overall', 'overcome', 'overlap', 'oversee',
      'owner', 'pacific', 'package', 'painted', 'painter', 'parking', 'partial', 'partner',
      'passage', 'passing', 'passion', 'passive', 'patient', 'patrick', 'pattern', 'payment',
      'penalty', 'pending', 'pension', 'perfect', 'perform', 'perhaps', 'persist', 'personal',
      'phoenix', 'physics', 'picking', 'picture', 'pioneer', 'plastic', 'pleased', 'pleasure',
      'pointed', 'political', 'popular', 'portion', 'portrait', 'possess', 'possible', 'poverty',
      'powered', 'practical', 'praised', 'precise', 'predict', 'prefer', 'premier', 'premium',
      'prepare', 'present', 'preserve', 'pressed', 'pressure', 'prevent', 'preview', 'previous',
      'primary', 'printer', 'privacy', 'private', 'problem', 'proceed', 'process', 'produce',
      'product', 'profile', 'program', 'project', 'promise', 'promote', 'prompt', 'propose',
      'prospect', 'protect', 'protein', 'protest', 'provide', 'province', 'publish', 'pulling',
      'pupil', 'purpose', 'pursuit', 'pushing', 'putting', 'quality', 'quantum', 'quarter',
      'question', 'quickly', 'radical', 'railway', 'rainbow', 'raising', 'ranking', 'rapidly',
      'rational', 'raymond', 'reached', 'readily', 'reading', 'reality', 'realize', 'receipt',
      'receive', 'recently', 'recession', 'reckon', 'record', 'recover', 'reflect', 'reform',
      'refugee', 'refused', 'regain', 'regard', 'regime', 'regional', 'register', 'regular',
      'reject', 'related', 'relative', 'relaxed', 'release', 'relevant', 'relief', 'religion',
      'remark', 'remains', 'removal', 'removed', 'replace', 'replied', 'request', 'require',
      'rescue', 'research', 'reserve', 'resident', 'resolve', 'resource', 'respect', 'respond',
      'restore', 'retired', 'retreat', 'retrieve', 'revenue', 'reverse', 'revised', 'revolution',
      'richard', 'rightly', 'roberts', 'rolling', 'routine', 'running', 'russell', 'russian',
      'satisfied', 'scandal', 'scenario', 'scholar', 'science', 'scottish', 'scratch', 'section',
      'secular', 'secured', 'segment', 'selling', 'seminar', 'senator', 'sending', 'senior',
      'sensible', 'sentence', 'separate', 'sequence', 'serious', 'servant', 'service', 'session',
      'setting', 'settled', 'several', 'seventh', 'seventh', 'shallow', 'shaping', 'sharing',
      'shelter', 'sheriff', 'shifted', 'shining', 'shipping', 'shocked', 'shooting', 'shopping',
      'shortly', 'showing', 'shutting', 'sibling', 'sixteen', 'skilled', 'slavery', 'sleeping',
      'slender', 'sliding', 'smoking', 'so-called', 'socialism', 'society', 'somehow', 'someone',
      'sophisticated', 'sorting', 'spanish', 'speaker', 'special', 'species', 'specific', 'spectrum',
      'spiritual', 'sporting', 'squared', 'stadium', 'staring', 'station', 'statute', 'staying',
      'stephen', 'stewart', 'storage', 'strange', 'strategic', 'stretch', 'striking', 'struggle',
      'student', 'studied', 'subject', 'succeed', 'success', 'succumb', 'suddenly', 'sufficient',
      'suggest', 'summary', 'sunlight', 'support', 'suppose', 'supreme', 'surface', 'surgeon',
      'surplus', 'surprise', 'surround', 'survive', 'suspect', 'sustain', 'sweeping', 'swiftly',
      'sympathy', 'symptom', 'tactics', 'talking', 'teacher', 'teaching', 'theater', 'theatre',
      'thereby', 'thermal', 'thinking', 'thirteen', 'thought', 'thousand', 'threats', 'through',
      'tonight', 'tourist', 'towards', 'trading', 'traffic', 'tragedy', 'trained', 'trainer',
      'transit', 'transmission', 'transport', 'trapped', 'traveler', 'treated', 'treated', 'treaty',
      'triumph', 'trouble', 'turning', 'typical', 'unclear', 'undergo', 'uniform', 'unknown',
      'unusual', 'updated', 'upgrade', 'upscale', 'upstart', 'uranium', 'utility', 'vaccine',
      'valley', 'vanilla', 'various', 'vatican', 'venture', 'verdict', 'version', 'veteran',
      'victory', 'village', 'vincent', 'vintage', 'violate', 'violent', 'virtual', 'visible',
      'visitor', 'vitamin', 'voltage', 'volumes', 'waiting', 'walking', 'wanting', 'warfare',
      'warming', 'warning', 'warrant', 'washing', 'watched', 'weather', 'wedding', 'weekend',
      'welcome', 'welfare', 'western', 'whereas', 'whether', 'whoever', 'william', 'willing',
      'winning', 'winston', 'without', 'witness', 'working', 'worried', 'worship', 'writing',
      'written', 'younger'
    ],
    guess: []
  }
};

// Add common additional guess words to each list
const additionalGuessWords: Record<number, string[]> = {
  3: ['aha', 'awl', 'baa', 'bah', 'boo', 'chi', 'cue', 'cur', 'cwm', 'dab', 'din', 'duo', 'ebb', 'err', 'eta', 'fax', 'fez', 'fie', 'foo', 'fro', 'gad', 'gee', 'gnu', 'goo', 'hah', 'haw', 'hmm', 'huh', 'ilk', 'jab', 'jot', 'kai', 'koi', 'lei', 'lex', 'lye', 'meh', 'moo', 'mow', 'nah', 'nay', 'nix', 'nth', 'ohm', 'ooh', 'ops', 'ova', 'owe', 'pap', 'paw', 'pew', 'phi', 'pho', 'pox', 'psi', 'pun', 'qua', 'rad', 'raj', 'rho', 'rut', 'sag', 'sap', 'sax', 'ska', 'sox', 'sty', 'tau', 'tee', 'tho', 'tsk', 'tux', 'ugh', 'ump', 'urn', 'vex', 'via', 'viz', 'wad', 'wee', 'wok', 'yam', 'yap', 'yaw', 'yep', 'yin', 'yup', 'zap', 'zed', 'zen', 'zit'],
  4: ['abbe', 'abed', 'abet', 'able', 'ably', 'abut', 'achy', 'acne', 'acre', 'acyl', 'aero', 'afar', 'affix', 'afire', 'aged', 'ager', 'agog', 'ague', 'ahem', 'aide', 'ails', 'aims', 'aint', 'airn', 'airs', 'airy', 'ajar', 'akin', 'alae', 'alan', 'alar', 'alas', 'alba', 'albs', 'alec', 'alee', 'ales', 'alfs', 'alga', 'alia', 'alit', 'alky', 'alls', 'ally', 'alma', 'alms', 'aloe', 'alps', 'alto', 'alum', 'amas', 'ambo', 'amen', 'amid', 'amie', 'amin', 'amir', 'amis', 'ammo', 'amok', 'amps', 'amyl', 'anal', 'ands', 'anew', 'ankh', 'anna', 'anon', 'ante', 'anti', 'ants', 'anus', 'aped', 'aper', 'apes', 'apex', 'apod', 'apse', 'aqua', 'Arab', 'arbs', 'arch', 'arcs', 'area', 'ares', 'aria', 'arid', 'arks', 'arms', 'army', 'arty', 'aryl', 'asci', 'ashy', 'asks', 'asps', 'atop', 'aunt', 'aura', 'auto', 'aver', 'aves', 'avid', 'avow', 'awed', 'awes', 'awls', 'awns', 'awny', 'awol', 'awry', 'axed', 'axel', 'axes', 'axil', 'axis', 'axle', 'axon', 'ayah', 'ayes', 'babe', 'babs', 'baby', 'bach', 'back', 'bade', 'bads', 'baff', 'bags', 'baht', 'bail', 'bait', 'bake', 'bald', 'bale', 'balk', 'ball', 'balm', 'bals', 'bams', 'banc', 'band', 'bane', 'bang', 'bani', 'bank', 'bans', 'baps', 'barb', 'bard', 'bare', 'barf', 'bark', 'barm', 'barn', 'bars', 'base', 'bash', 'bask', 'bass', 'bast', 'bate', 'bath', 'bats', 'batt', 'baud', 'bawd', 'bawl', 'bays', 'bead', 'beak', 'beam', 'bean', 'bear', 'beat', 'beau', 'beck', 'beds', 'beef', 'been', 'beep', 'beer', 'bees', 'beet', 'beg', 'begs', 'bell', 'bels', 'belt', 'bema', 'bend', 'bene', 'bens', 'bent', 'berg', 'berm', 'best', 'beta', 'beth', 'bets', 'bevy', 'bezel', 'bias', 'bibb', 'bibs', 'bice', 'bide', 'bids', 'bier', 'biff', 'bigs', 'bike', 'bile', 'bilk', 'bill', 'bims', 'bind', 'bine', 'bing', 'bins', 'bint', 'biod', 'biog', 'biol', 'bios', 'bird', 'birk', 'birl', 'biro', 'bise', 'bisk', 'bite', 'bits', 'bitt', 'biz', 'blab', 'blad', 'blah', 'blam', 'blat', 'blaw', 'bled', 'blet', 'blew', 'blin', 'blip', 'blob', 'bloc', 'blot', 'blow', 'blub', 'blue', 'blur', 'boar', 'boas', 'boat', 'bobs', 'bock', 'bode', 'bods', 'body', 'boff', 'bogs', 'bogy', 'boil', 'bola', 'bold', 'bole', 'boll', 'bolo', 'bolt', 'bomb', 'bond', 'bone', 'bong', 'bonk', 'bony', 'boob', 'book', 'boom', 'boon', 'boor', 'boos', 'boot', 'bops', 'bora', 'bore', 'born', 'bort', 'bosh', 'bosk', 'boss', 'both', 'bots', 'bott', 'bout', 'bowl', 'bows', 'boxy', 'boyo', 'boys', 'bozo', 'brad', 'brae', 'brag', 'bran', 'bras', 'brat', 'braw', 'bray', 'bred', 'bree', 'brer', 'brew', 'brie', 'brig', 'brim', 'brin', 'brio', 'bris', 'brit', 'brno', 'bro', 'bros', 'brow', 'brr', 'brut', 'bubs', 'buck', 'buds', 'buff', 'bugs', 'buhl', 'bulk', 'bull', 'bumf', 'bump', 'bums', 'buna', 'bund', 'bung', 'bunk', 'bunn', 'buns', 'bunt', 'buoy', 'bura', 'burb', 'burd', 'burg', 'burl', 'burn', 'burp', 'burr', 'burs', 'bury', 'bush', 'busk', 'buss', 'bust', 'busy', 'bute', 'buts', 'butt', 'buys', 'buzz', 'byes', 'bylaw', 'byre', 'byrl', 'byte'],
  5: ['aback', 'abaci', 'abase', 'abash', 'abate', 'abbey', 'abbot', 'abeam', 'abets', 'abhor', 'abide', 'abler', 'ables', 'abode', 'abort', 'about', 'above', 'abuse', 'abuts', 'abyss', 'acari', 'accede', 'ached', 'aches', 'achoo', 'acids', 'acing', 'acini', 'acned', 'acnes', 'acorn', 'acres', 'acrid', 'acted', 'actin', 'actor', 'acute', 'adage', 'adapt', 'adder', 'addle', 'adeem', 'adept', 'adieu', 'adios', 'adits', 'adman', 'admen', 'admin', 'admit', 'admix', 'adobe', 'adopt', 'adore', 'adorn', 'adown', 'adult', 'adzes', 'aecia', 'aegis', 'aeons', 'aerie', 'afar', 'afars', 'afire', 'afoot', 'afore', 'afoul', 'after', 'again', 'agape', 'agars', 'agate', 'agave', 'agaze', 'agent', 'aggie', 'aghas', 'agile', 'aging', 'agios', 'agism', 'agist', 'aglee', 'aglet', 'agley', 'aglow', 'agmas', 'agone', 'agons', 'agony', 'agora', 'agree', 'agria', 'agues', 'ahead', 'aider', 'aides', 'aimer', 'aired', 'airer', 'aisle', 'aitch', 'aiver', 'alarm', 'alary', 'album', 'alcid', 'alder', 'aldol', 'alecs', 'alefs', 'aleph', 'alert', 'alfas', 'algae', 'algal', 'algas', 'algid', 'algin', 'algor', 'algum', 'alias', 'alibi', 'alien', 'align', 'alike', 'aline', 'alist', 'alive', 'alkyd', 'alkyl', 'allay', 'allee', 'alley', 'allod', 'allot', 'allow', 'alloy', 'allyl', 'almah', 'almas', 'almes', 'almond', 'almud', 'almug', 'aloes', 'aloft', 'aloha', 'aloin', 'alone', 'along', 'aloof', 'aloud', 'alpha', 'altar', 'alter', 'altho', 'altos', 'alula', 'alums', 'alway', 'amahs', 'amain', 'amass', 'amaze', 'amber', 'ambit', 'amble', 'ambos', 'ambry', 'ameba', 'ameer', 'amend', 'amens', 'ament', 'amias', 'amice', 'amide', 'amido', 'amids', 'amies', 'amiga', 'amigo', 'amine', 'amino', 'amins', 'amirs', 'amiss', 'amity', 'amnio', 'amoks', 'among', 'amort', 'amour', 'amped', 'ample', 'amply', 'ampul', 'amuck', 'amuse', 'amyls', 'ancho', 'angel', 'anger', 'angle', 'angry', 'angst', 'anile', 'anils', 'anima', 'anime', 'anion', 'anise', 'ankle', 'anlas', 'annal', 'annas', 'annex', 'annoy', 'annul', 'anode', 'anole', 'ansae', 'antae', 'antas', 'anted', 'antes', 'antic', 'antis', 'antra', 'antre', 'antsy', 'anvil', 'aorta', 'apace', 'apart', 'apeak', 'apeek', 'apers', 'apery', 'aphid', 'aphis', 'apian', 'aping', 'apish', 'apnea', 'apods', 'aport', 'appal', 'appel', 'apple', 'apply', 'appro', 'apres', 'apron', 'apses', 'apsis', 'apter', 'aptly', 'aquae', 'aquas', 'araks', 'arbor', 'arcus', 'ardeb', 'ardor', 'areae', 'areal', 'areas', 'areca', 'areic', 'arena', 'arete', 'argal', 'argil', 'argle', 'argol', 'argon', 'argot', 'argue', 'argus', 'arhat', 'arias', 'ariel', 'arils', 'arise', 'arles', 'armed', 'armer', 'armet', 'armor', 'aroid', 'aroma', 'arose', 'arpen', 'arras', 'array', 'arrau', 'arrow', 'arses', 'arsis', 'arson', 'artal', 'artel', 'artsy', 'arums', 'arval', 'arvos', 'aryls', 'asana', 'ascot', 'ascus', 'asdic', 'ashed', 'ashen', 'ashes', 'aside', 'asked', 'asker', 'askew', 'askoi', 'askos', 'aspen', 'asper', 'aspic', 'aspis', 'assai', 'assay', 'asses', 'asset', 'aster', 'astir', 'asyla', 'ataps', 'ataxy', 'atilt', 'atlas', 'atman', 'atmas', 'atoll', 'atoms', 'atomy', 'atone', 'atony', 'atopy', 'atria', 'atrip', 'attar', 'attic', 'audit', 'auger', 'aught', 'augur', 'auks', 'aulic', 'aunts', 'aunty', 'aurae', 'aural', 'aurar', 'auras', 'aurei', 'aures', 'auric', 'auris', 'aurum', 'autos', 'auxin', 'avail', 'avant', 'avast', 'avens', 'avers', 'avert', 'avgas', 'avian', 'avion', 'aviso', 'avoid', 'avows', 'await', 'awake', 'award', 'aware', 'awash', 'awful', 'awing', 'awned', 'awoke', 'awols', 'axels', 'axial', 'axile', 'axils', 'axing', 'axiom', 'axion', 'axite', 'axled', 'axles', 'axman', 'axmen', 'axone', 'axons', 'azans', 'azide', 'azido', 'azine', 'azlon', 'azoic', 'azole', 'azons', 'azote', 'azoth', 'azuki', 'azure'],
  6: ['abacas', 'abacus', 'abakas', 'abamps', 'abased', 'abaser', 'abases', 'abasia', 'abated', 'abater', 'abates', 'abatis', 'abator', 'abbacy', 'abbess', 'abbeys', 'abbots', 'abduce', 'abduct', 'abhors', 'abided', 'abider', 'abides', 'abject', 'abjure', 'ablate', 'ablaut', 'ablaze', 'ablest', 'abloom', 'ablush', 'abmhos', 'aboard', 'aboded', 'abodes', 'abohms', 'abolla', 'abomas', 'aboral', 'aborts', 'abound', 'aboves', 'abrade', 'abrase', 'abroad', 'abrupt', 'abseil', 'absent', 'absorb', 'absurd', 'abulia', 'abulic', 'abused', 'abuser', 'abuses', 'abvolt', 'abwatt', 'abying', 'abysms', 'acacia', 'acajou', 'acarid', 'acarus', 'accede', 'accent', 'accept', 'access', 'accord', 'accost', 'accrue', 'accuse', 'acedia', 'acetal', 'acetic', 'acetin', 'acetum', 'acetyl', 'achene', 'achier', 'aching', 'acidic', 'acidly', 'acinar', 'acinic', 'acinus', 'ackees', 'acnode', 'acorns', 'acquit', 'across', 'acting', 'actins', 'action', 'active', 'actons', 'actors', 'actual', 'acuate', 'acuity', 'aculei', 'acumen', 'acuter', 'acutes', 'adages', 'adagio', 'adapts', 'addend', 'adders', 'addict', 'adding', 'addled', 'addles', 'adduce', 'adduct', 'adenyl', 'adepts', 'adhere', 'adieus', 'adieux', 'adipic', 'adjoin', 'adjure', 'adjust', 'admass', 'admire', 'admits', 'admixt', 'adnate', 'adnexa', 'adnoun', 'adobes', 'adobos', 'adonis', 'adopts', 'adored', 'adorer', 'adores', 'adorns', 'adrift', 'adroit', 'adsorb', 'adults', 'advect', 'advent', 'adverb', 'advert', 'advice', 'advise', 'adytum', 'adzuki', 'aecial', 'aecium', 'aedile', 'aedine', 'aeneus', 'aeonic', 'aerate', 'aerial', 'aeries', 'aerier', 'aerify', 'aerily', 'aerobe', 'aerugo', 'aether', 'afeard', 'affair', 'affect', 'affine', 'affirm', 'afflux', 'afford', 'affray', 'afghan', 'afield', 'aflame', 'afloat', 'afraid', 'afreet', 'afresh', 'afrits', 'afters', 'aftosa', 'agamas', 'agamic', 'agamid', 'agapae', 'agapai', 'agaric', 'agates', 'agaves', 'agedly', 'ageing', 'ageism', 'ageist', 'agency', 'agenda', 'agenes', 'agents', 'aggada', 'aggers', 'aggies', 'aggros', 'aghast', 'agings', 'agisms', 'agists', 'agitas', 'aglare', 'agleam', 'aglets', 'agnail', 'agnate', 'agnize', 'agonal', 'agones', 'agonic', 'agorae', 'agoras', 'agorot', 'agouti', 'agouty', 'agrafe', 'agreed', 'agrees', 'agrias', 'aguish', 'ahchoo', 'ahimsa', 'aholds', 'ahorse', 'aiders', 'aidful', 'aiding', 'aidman', 'aidmen', 'aiglet', 'aigret', 'aikido', 'ailing', 'aimers', 'aimful', 'aiming', 'aiolis', 'airbed', 'airbus', 'airers', 'airest', 'airier', 'airily', 'airing', 'airman', 'airmen', 'airted', 'airths', 'airway', 'aisled', 'aisles', 'aivers', 'ajivas', 'ajowan', 'ajugas', 'akelas', 'akenes', 'akimbo', 'alamos', 'alands', 'alanin', 'alants', 'alanyl', 'alarms', 'alarum', 'alaska', 'alated', 'alates', 'albata', 'albedo', 'albeit', 'albino', 'albite', 'albums', 'alcade', 'alcaic', 'alcids', 'alcove', 'alders', 'aldols', 'aldose', 'aldrin', 'alegar', 'alephs', 'alerts', 'alevin', 'alexia', 'alexin', 'alfaki', 'alforja', 'algaes', 'algid', 'algoid', 'algors', 'algums', 'alibis', 'alible', 'alidad', 'aliens', 'alight', 'aligns', 'alined', 'aliner', 'alines', 'aliped', 'aliyah', 'aliyas', 'aliyos', 'aliyot', 'alkali', 'alkane', 'alkene', 'alkies', 'alkine', 'alkoxy', 'alkyds', 'alkyls', 'allays', 'allege', 'allele', 'alleys', 'allied', 'allies', 'allium', 'allods', 'allots', 'allows', 'alloys', 'allude', 'allure', 'allyls', 'almahs', 'almehs', 'almner', 'almond', 'almost', 'almuce', 'almude', 'almuds', 'almugs', 'almute', 'alnico', 'alodia', 'alohas', 'aloins', 'alpaca', 'alphas', 'alphyl', 'alpine', 'alsike', 'altars', 'alters', 'althea', 'aludel', 'alulae', 'alular', 'alumin', 'alumna', 'alumni', 'alvine', 'always', 'amadou', 'amain', 'amatol', 'amaze', 'amazon', 'ambage', 'ambari', 'ambary', 'ambeer', 'ambers', 'ambery', 'ambits', 'ambled', 'ambler', 'ambles', 'amboid', 'amebae', 'ameban', 'amebas', 'amebic', 'ameers', 'amends', 'aments', 'amerce', 'amices', 'amicus', 'amides', 'amidic', 'amidin', 'amidol', 'amidst', 'amigas', 'amigos', 'amines', 'aminic', 'ammine', 'ammino', 'ammono', 'amnion', 'amnios', 'amoeba', 'amoles', 'amoral', 'amount', 'amours', 'ampere', 'amping', 'ampler', 'ampule', 'ampuls', 'amrita', 'amtrac', 'amucks', 'amulet', 'amused', 'amuser', 'amuses', 'amusia', 'amylic', 'amylum', 'anabas', 'anadem', 'anaemia', 'anally', 'analog', 'ananke', 'anarch', 'anatto', 'anchor', 'anchos', 'ancone', 'andante', 'anears', 'aneled', 'aneles', 'anemia', 'anemic', 'anenst', 'anergy', 'angary', 'angels', 'angers', 'angina', 'angled', 'angler', 'angles', 'angora', 'angsts', 'anilin', 'animal', 'animas', 'animes', 'animis', 'animus', 'anions', 'anises', 'anisic', 'ankled', 'ankles', 'anklet', 'ankush', 'anlace', 'anlage', 'annals', 'anneal', 'annexa', 'annexe', 'annona', 'annoys', 'annual', 'annuli', 'annuls', 'anodal', 'anodes', 'anodic', 'anoint', 'anoles', 'anomic', 'anomie', 'anonym', 'anopia', 'anorak', 'anoxia', 'anoxic', 'ansate', 'answer', 'anteed', 'anthem', 'anther', 'antiar', 'antick', 'antics', 'anting', 'antler', 'antral', 'antres', 'antrum', 'anural', 'anuran', 'anuria', 'anuric', 'anuses', 'anvils', 'anonym', 'anytime', 'anyway', 'aorist', 'aortae', 'aortal', 'aortas', 'aortic', 'aoudad', 'apache', 'apathy', 'apercu', 'apeman', 'apemen', 'apexes', 'aphids', 'aphtha', 'apiary', 'apical', 'apices', 'apiece', 'aplite', 'aplomb', 'apneal', 'apneas', 'apneic', 'apnoea', 'apodal', 'apogee', 'apollo', 'apolog', 'aporia', 'appall', 'appals', 'appeal', 'appear', 'appels', 'append', 'apples', 'appose', 'aprons', 'apses', 'apsidal', 'aptest', 'arabic', 'arabin', 'arable', 'aralia', 'aramid', 'arbors', 'arbour', 'arbute', 'arcade', 'arcana', 'arcane', 'arched', 'archer', 'arches', 'archil', 'archly', 'archon', 'arcing', 'arctic', 'ardebs', 'ardent', 'ardors', 'ardour', 'arecas', 'arenas', 'areola', 'areole', 'arepas', 'aretes', 'argala', 'argali', 'argals', 'argent', 'argils', 'argled', 'argles', 'argols', 'argons', 'argosy', 'argots', 'argued', 'arguer', 'argues', 'argufy', 'argyle', 'arhats', 'arider', 'aridly', 'ariels', 'aright', 'ariled', 'ariose', 'ariosi', 'arioso', 'arisen', 'arises', 'arista', 'aristo', 'arkose', 'armada', 'armers', 'armets', 'armful', 'armies', 'arming', 'armlet', 'armors', 'armory', 'armour', 'armpit', 'armure', 'arnica', 'aroids', 'aroint', 'aromas', 'around', 'arouse', 'arpens', 'arpent', 'arrack', 'arrant', 'arrays', 'arrear', 'arrest', 'arriba', 'arrive', 'arroba', 'arrows', 'arrowy', 'arroyo', 'arseno', 'arshin', 'arsine', 'arsino', 'arsons', 'artels', 'artery', 'artful', 'artier', 'artily', 'artist', 'asanas', 'asarum', 'ascend', 'ascent', 'ascots', 'asdics', 'ashame', 'ashcan', 'ashier', 'ashing', 'ashlar', 'ashler', 'ashman', 'ashmen', 'ashore', 'ashram', 'asides', 'askant', 'askers', 'asking', 'aslant', 'asleep', 'aslope', 'aspect', 'aspens', 'aspers', 'aspics', 'aspire', 'aspish', 'assail', 'assais', 'assays', 'assent', 'assert', 'assess', 'assets', 'assign', 'assist', 'assize', 'assoil', 'assort', 'assume', 'assure', 'astern', 'asters', 'asthma', 'astir', 'astony', 'astral', 'astray', 'astute', 'aswarm', 'aswirl', 'aswoon', 'asylum', 'atabal', 'ataman', 'atavic', 'ataxia', 'ataxic', 'atelic', 'atlatl', 'atmans', 'atolls', 'atomic', 'atonal', 'atoned', 'atoner', 'atones', 'atonia', 'atonic', 'atopic', 'atrial', 'atrium', 'attach', 'attack', 'attain', 'attars', 'attend', 'attent', 'attest', 'attics', 'attire', 'attorn', 'attrit', 'attune', 'atwain', 'atween', 'atypic', 'aubade', 'auburn', 'aucuba', 'audads', 'audial', 'audile', 'auding', 'audios', 'audits', 'augend', 'augers', 'aughts', 'augite', 'augurs', 'augury', 'august', 'auklet', 'aulder', 'auntie', 'auntly', 'aurae', 'aurate', 'aureus', 'aurist', 'aurora', 'aurous', 'aurums', 'auspex', 'ausubo', 'auteur', 'author', 'autism', 'autist', 'autoed', 'autumn', 'auxins', 'avails', 'avatar', 'avaunt', 'avenge', 'avenue', 'averse', 'averts', 'avians', 'aviary', 'aviate', 'avidin', 'avidly', 'avions', 'avisos', 'avocet', 'avoids', 'avoset', 'avouch', 'avowal', 'avowed', 'avower', 'avulse', 'awaits', 'awaked', 'awaken', 'awakes', 'awards', 'aweary', 'aweigh', 'aweing', 'awhile', 'awhirl', 'awless', 'awmous', 'awning', 'awoken', 'axeman', 'axemen', 'axenic', 'axilla', 'axioms', 'axions', 'axised', 'axises', 'axites', 'axlike', 'axonal', 'axones', 'axonic', 'axseed', 'azalea', 'azides', 'azines', 'azlons', 'azoles', 'azonal', 'azonic', 'azoted', 'azotes', 'azoths', 'azotic', 'azukis', 'azures', 'azygos'],
  7: ['abalone', 'abandon', 'abasers', 'abashed', 'abashes', 'abasias', 'abaters', 'abating', 'abators', 'abattis', 'abaxial', 'abaxile', 'abbotcy', 'abdomen', 'abduced', 'abduces', 'abducts', 'abelian', 'abelias', 'abettal', 'abetted', 'abetter', 'abettor', 'abeyant', 'abfarad', 'abhenry', 'abidden', 'abiders', 'abiding', 'abigail', 'ability', 'abioses', 'abiosis', 'abiotic', 'abjects', 'abjured', 'abjurer', 'abjures', 'ablated', 'ablates', 'ablator', 'ablauts', 'ableism', 'ableist', 'ablings', 'abluent', 'abluted', 'aboding', 'abolish', 'abollae', 'abomasa', 'abomasi', 'aboral', 'aborned', 'aborter', 'aborted', 'abortus', 'abought', 'aboulia', 'aboulic', 'abounds', 'abraded', 'abrader', 'abrades', 'abreact', 'abreast', 'abridge', 'abroach', 'abrosia', 'abscess', 'abscise', 'abscond', 'abseils', 'absence', 'absents', 'absinth', 'absolve', 'absorbs', 'abstain', 'absterge', 'absurd', 'absurds', 'abulias', 'abusers', 'abusing', 'abusive', 'abuttal', 'abutted', 'abutter', 'abvolts', 'abwatts', 'abysmal', 'abyssal', 'abysses', 'acacias', 'academe', 'academy', 'acajous', 'acaleph', 'acantha', 'acanths', 'acapnia', 'acardan', 'acarids', 'acarine', 'acaroid', 'acaudal', 'acceded', 'acceder', 'accedes', 'accent', 'accepts', 'accidia', 'accidie', 'acclaim', 'accompt', 'accords', 'accosts', 'account', 'accouter', 'accrete', 'accrual', 'accrued', 'accrues', 'accurse', 'accusal', 'accused', 'accuser', 'accuses', 'acedias', 'acequia', 'acerate', 'acerber', 'acerbic', 'acerola', 'acerose', 'acerous', 'acetals', 'acetate', 'acetify', 'acetins', 'acetone', 'acetose', 'acetous', 'acetyls', 'achenes', 'achier', 'achieve', 'achiote', 'achiral', 'acholia', 'acicula', 'acidify', 'acidity', 'aciform', 'acinose', 'acinous', 'aclinic', 'acmatic', 'acnodes', 'acolyte', 'aconite', 'acorned', 'acquest', 'acquire', 'acquits', 'acrasin', 'acreage', 'acrider', 'acridly', 'acrobat', 'acrogen', 'acromia', 'acronic', 'acronym', 'acrotic', 'acrylic', 'actable', 'actinal', 'actings', 'actinia', 'actinic', 'actinon', 'actions', 'activate', 'actives', 'actorly', 'actress', 'actuary', 'actuate', 'aculeus', 'acumens', 'acutely', 'acutest', 'acyclic', 'acylate', 'acyloin', 'adagial', 'adagios', 'adamant', 'adapted', 'adapter', 'adaptor', 'adaxial', 'addable', 'addaxes', 'addedly', 'addenda', 'addends', 'addible', 'addicts', 'additions', 'address', 'addrest', 'adduced', 'adducer', 'adduces', 'adducts', 'adeemed', 'adenine', 'adenoid', 'adenoma', 'adenyls', 'adepter', 'adeptly', 'adhered', 'adherer', 'adheres', 'adhibit', 'adioses', 'adipose', 'adipous', 'adjoins', 'adjoint', 'adjourn', 'adjudge', 'adjunct', 'adjured', 'adjurer', 'adjures', 'adjuror', 'adjusts', 'admiral', 'admired', 'admirer', 'admires', 'admixed', 'admixes', 'adnexal', 'adnouns', 'adopted', 'adoptee', 'adopter', 'adorers', 'adoring', 'adorned', 'adorner', 'adrenal', 'adsorbs', 'adulate', 'advance', 'advects', 'advents', 'adverbs', 'adversa', 'adverse', 'adverts', 'advices', 'advised', 'advisee', 'adviser', 'advises', 'advisor', 'adytums', 'adzukis', 'aecidial', 'aediles', 'aegises', 'aeneous', 'aeolian', 'aeonian', 'aerated', 'aerates', 'aerator', 'aerials', 'aeriest', 'aerobat', 'aerobia', 'aerobic', 'aerobes', 'aerogel', 'aerosat', 'aerosol', 'aerugos', 'aethers', 'aetites', 'afeared', 'affable', 'affably', 'affaire', 'affairs', 'affects', 'affiant', 'affiche', 'affinal', 'affined', 'affines', 'affirms', 'affixed', 'affixer', 'affixes', 'afflict', 'afflux', 'affords', 'affrays', 'affrights', 'afghani', 'afghans', 'afreets', 'aftmost', 'aftosas', 'agamete', 'agamids', 'agamous', 'agapeae', 'agapeic', 'agarics', 'agarose', 'agatize', 'agatoid', 'ageings', 'ageisms', 'ageists', 'ageless', 'agelong', 'agencies', 'agendas', 'agendum', 'agenize', 'agented', 'agentry', 'ageusia', 'aggadah', 'aggadas', 'aggadic', 'aggadot', 'aggrade', 'aggress', 'agilely', 'agility', 'aginner', 'agisted', 'agitate', 'agitato', 'aglow', 'agnails', 'agnates', 'agnatic', 'agnized', 'agnizes', 'agnomen', 'agonies', 'agonise', 'agonist', 'agonize', 'agoroth', 'agoutis', 'agrafes', 'agraffe', 'agrapha', 'agravic', 'agreeing', 'agrees', 'aidless', 'aiglets', 'aigrets', 'aikidos', 'aileron', 'ailment', 'aimless', 'ainsell', 'airbags', 'airbill', 'airboat', 'aircrew', 'airdate', 'airdrop', 'airfare', 'airflow', 'airfoil', 'airglow', 'airhead', 'airhole', 'airiest', 'airings', 'airless', 'airlift', 'airlike', 'airline', 'airmail', 'airpark', 'airplay', 'airport', 'airpost', 'airshed', 'airship', 'airshow', 'airsick', 'airthed', 'airtime', 'airting', 'airward', 'airwave', 'airways', 'airwise', 'aitches', 'ajowans', 'ajugas', 'akebias', 'akvavit', 'alameda', 'alamode', 'alanine', 'alanins', 'alanyls', 'alarmed', 'alarums', 'alaskas', 'alastor', 'alation', 'albatas', 'albedos', 'albergo', 'albinal', 'albinos', 'albites', 'albitic', 'albizia', 'albumen', 'albumin', 'alcades', 'alcaics', 'alcaide', 'alcalde', 'alcayde', 'alcazar', 'alchemy', 'alcohol', 'alcoved', 'alcoves', 'aldehyde', 'alderfly', 'aldoses', 'aldrins', 'alecost', 'alegars', 'alembic', 'alencon', 'alength', 'alephs', 'alerted', 'alerter', 'alertly', 'aleuron', 'alevins', 'alewife', 'alexias', 'alexine', 'alexins', 'alfakis', 'alfalfa', 'alfaqui', 'alforja', 'algebra', 'algetic', 'algicide', 'algidly', 'alginic', 'algoid', 'aliases', 'alibied', 'alibies', 'alidade', 'alidads', 'aliened', 'alienee', 'aliener', 'alienly', 'alienor', 'aliform', 'alights', 'aligned', 'aligner', 'alikers', 'aliment', 'alimony', 'aliners', 'alining', 'aliquot', 'alisma', 'aliyahs', 'alizari', 'alkalis', 'alkanes', 'alkanet', 'alkenes', 'alkines', 'alkylic', 'alkyne', 'alkynes', 'allayed', 'allayer', 'alleged', 'alleger', 'alleges', 'allegro', 'alleles', 'allelic', 'allergy', 'allheal', 'allicin', 'allies', 'alliums', 'allobar', 'allodia', 'allonge', 'allonym', 'alloted', 'allotee', 'allover', 'allowed', 'alloxan', 'alloyed', 'allseed', 'alluded', 'alludes', 'allured', 'allurer', 'allures', 'alluvia', 'allying', 'allylic', 'almanac', 'almande', 'almehs', 'almners', 'almonds', 'almondy', 'almoner', 'almonry', 'almsman', 'almsmen', 'almuces', 'almudes', 'alodial', 'alodium', 'aloetic', 'alogias', 'aloin', 'alpacas', 'alphorn', 'alphyls', 'alpines', 'already', 'alright', 'alsikes', 'altered', 'alterer', 'althaea', 'altheas', 'althorn', 'aludels', 'alumina', 'alumine', 'alumins', 'alumium', 'alumnus', 'alumnae', 'alunite', 'alveoli', 'alyssum', 'amadous', 'amalgam', 'amanita', 'amarone', 'amassed', 'amasser', 'amasses', 'amateur', 'amative', 'amatols', 'amatory', 'amazing', 'amazons', 'ambages', 'ambaris', 'ambary', 'ambassador', 'ambears', 'ambeers', 'ambient', 'amblers', 'ambling', 'amboina', 'ambones', 'amboyna', 'ambries', 'ambroid', 'ambsace', 'ambulant', 'ambusher', 'amebean', 'ameboid', 'amelcorn', 'amended', 'amender', 'amenity', 'amental', 'amentia', 'amerced', 'amercer', 'amerces', 'amesace', 'amethyst', 'amiable', 'amiably', 'amidase', 'amidine', 'amidins', 'amidols', 'amidone', 'amidship', 'amigate', 'aminity', 'ammeter', 'ammines', 'ammonal', 'ammonia', 'ammonic', 'amnesia', 'amnesic', 'amnesty', 'amnions', 'amniote', 'amoebae', 'amoeban', 'amoebas', 'amoebic', 'amongst', 'amorini', 'amorino', 'amorist', 'amoroso', 'amorous', 'amorph', 'amounts', 'amperage', 'amperor', 'amperes', 'amphora', 'amplest', 'amplify', 'ampoule', 'ampules', 'ampulla', 'amputee', 'amreeta', 'amritas', 'amtrack', 'amtracs', 'amulets', 'amusers', 'amusias', 'amusing', 'amusive', 'amygdal', 'amylase', 'amylene', 'amyloid', 'amylose', 'amylum', 'anabases', 'anabasis', 'anadem', 'anagoge', 'anagram', 'analcite', 'analgia', 'anality', 'analogs', 'analogue', 'analyse', 'analyst', 'analyte', 'analyze', 'anankes', 'anapest', 'anaphia', 'anaphor', 'anarchs', 'anarchy', 'anatase', 'anatomy', 'anattos', 'anaxial', 'anchors', 'anchovy', 'anchusa', 'ancient', 'ancilla', 'anconal', 'ancone', 'ancress', 'andante', 'andiron', 'android', 'aneared', 'aneling', 'anemias', 'anemone', 'anergic', 'aneroid', 'anestri', 'anethol', 'aneurin', 'anewly', 'angakok', 'angaria', 'angelic', 'angered', 'angerly', 'anginal', 'anginas', 'angioma', 'anglers', 'anglice', 'angling', 'angoras', 'angrier', 'angrily', 'anguish', 'angular', 'anhinga', 'aniline', 'anilins', 'anility', 'animals', 'animas', 'animate', 'animato', 'animism', 'animist', 'anionic', 'aniseed', 'anisole', 'anklets', 'ankling', 'anklung', 'ankuses', 'anlaces', 'anlagen', 'anlages', 'annates', 'annatto', 'anneals', 'annelid', 'annexed', 'annexes', 'annonas', 'annoyed', 'annoyer', 'annuity', 'annular', 'annulet', 'annuli', 'annulus', 'anodal', 'anodize', 'anodyne', 'anoints', 'anolyte', 'anomaly', 'anomies', 'anonyms', 'anopias', 'anopsia', 'anorak', 'anoraks', 'anorexy', 'anosmia', 'anosmic', 'another', 'anoxias', 'ansated', 'answers', 'antacid', 'antaric', 'anteater', 'antefix', 'anteing', 'antenna', 'anthems', 'anthers', 'anthill', 'anthoid', 'anthony', 'anthrax', 'antiair', 'antiar', 'antiars', 'antical', 'anticar', 'anticks', 'anticly', 'antifat', 'antiflu', 'antifog', 'antifur', 'antigay', 'antigen', 'antihero', 'antijar', 'antilog', 'antiman', 'antings', 'antipot', 'antique', 'antired', 'antisag', 'antisex', 'antitank', 'antitax', 'antiwar', 'antlers', 'antlike', 'antonym', 'antsier', 'antsily', 'anurans', 'anurias', 'anurous', 'anviled', 'anxiety', 'anxious', 'anybody', 'anymore', 'anytime', 'anyways', 'anywise', 'aorists', 'aoristic', 'aoudads', 'apaches', 'apagoge', 'apanage', 'aparejo', 'apart', 'apathia', 'apathy', 'apatite', 'apelike', 'apercus', 'aperies', 'aperk', 'aperity', 'apertly', 'apeward', 'aphagia', 'aphasia', 'aphasic', 'aphelia', 'apheses', 'aphesis', 'aphetic', 'aphides', 'aphonia', 'aphonic', 'aphotic', 'aphthae', 'aphylly', 'apian', 'apiaries', 'apicals', 'apiculi', 'apiece', 'apishly', 'aplasia', 'aplenty', 'aplites', 'aplitic', 'aplombs', 'apnoeae', 'apnoeal', 'apnoeas', 'apnoeic', 'apocarp', 'apocope', 'apodal', 'apodous', 'apogamy', 'apogean', 'apogee', 'apogeic', 'apollos', 'apologs', 'apology', 'apolune', 'apomict', 'apopyle', 'aporias', 'apostil', 'apostle', 'apothem', 'appallt', 'appalls', 'apparat', 'apparel', 'appeals', 'appears', 'appease', 'appends', 'applaud', 'applied', 'applier', 'applies', 'appoint', 'apports', 'apposed', 'apposer', 'apposes', 'appress', 'apprise', 'apprize', 'approve', 'appulse', 'apraxia', 'apraxic', 'apricot', 'aproned', 'apropos', 'aprotic', 'apsidal', 'apsides', 'apteral', 'apteria', 'apteryx', 'aptness', 'apyrase', 'aquaria', 'aquatic', 'aquatint', 'aquavit', 'aqueous', 'aquifer', 'aquiver', 'arabica', 'arabize', 'arables', 'aramids', 'araneid', 'araroba', 'arbiter', 'arbored', 'arbores', 'arbours', 'arbutes', 'arbutus', 'arcaded', 'arcades', 'arcadia', 'arcana', 'arcanum', 'archers', 'archery', 'archfoe', 'archils', 'arching', 'archive', 'archons', 'archway', 'arcking', 'arcsine', 'arctics', 'arcuate', 'arcuses', 'ardency', 'ardours', 'arduous', 'areally', 'areaway', 'arenite', 'arenose', 'arenous', 'areolae', 'areolar', 'areolas', 'areoles', 'argalas', 'argalis', 'argents', 'argil', 'argling', 'argotic', 'argufied', 'argufy', 'arguers', 'arguing', 'arguses', 'argyles', 'argylls', 'ariadne', 'aridest', 'aridity', 'arietta', 'ariette', 'arioso', 'ariosos', 'arising', 'aristae', 'aristas', 'aristos', 'arkoses', 'arkosic', 'armadas', 'armband', 'armfuls', 'armhole', 'armiger', 'armilla', 'armings', 'armless', 'armlets', 'armlike', 'armload', 'armlock', 'armoire', 'armored', 'armorer', 'armours', 'armoury', 'armpits', 'armrest', 'armsful', 'armures', 'arnatto', 'arnicas', 'arnotto', 'aroints', 'aromal', 'aromatic', 'aroused', 'arouser', 'arouses', 'aroynts', 'arpents', 'arracks', 'arraign', 'arrange', 'arrant', 'arrased', 'arrases', 'arrayed', 'arrayer', 'arrears', 'arrests', 'arriba', 'arriere', 'arrivals', 'arrobas', 'arrogant', 'arrowed', 'arroyo', 'arsenal', 'arsenic', 'arshins', 'arsines', 'article', 'artiest', 'artily', 'artisan', 'artiste', 'artists', 'artless', 'artwork', 'arugola', 'arugula', 'aruspex', 'aryballi', 'asarum', 'ascared', 'ascarid', 'ascaris', 'ascends', 'ascents', 'ascesis', 'ascetic', 'ascites', 'ascitic', 'ascribe', 'asepses', 'asepsis', 'aseptic', 'asexual', 'ashamed', 'ashcake', 'ashcans', 'ashfall', 'ashier', 'ashiest', 'ashlers', 'ashless', 'ashman', 'ashpans', 'ashram', 'ashrams', 'ashtray', 'asiagos', 'asinine', 'askance', 'askants', 'askeses', 'askesis', 'askewed', 'asocial', 'aspects', 'asperse', 'asperser', 'asphalt', 'asphyxy', 'aspic', 'aspired', 'aspirer', 'aspires', 'aspirin', 'aspises', 'asquint', 'asramas', 'assagai', 'assails', 'assault', 'assayed', 'assayer', 'assegai', 'assents', 'asserts', 'asserts', 'assever', 'assigns', 'assists', 'assizes', 'assoils', 'assorts', 'assuage', 'assumed', 'assumer', 'assumes', 'assured', 'assurer', 'assures', 'assuror', 'asswage', 'astasia', 'astatic', 'astatine', 'asteria', 'asternal', 'asteroid', 'astheny', 'asthma', 'astigma', 'astilbe', 'astound', 'astraddle', 'astraea', 'astral', 'astrals', 'astrict', 'astride', 'astroid', 'astylar', 'asunder', 'asylums', 'atabals', 'ataghan', 'atalaya', 'ataman', 'atamans', 'ataraxy', 'atavism', 'atavist', 'ataxias', 'ataxics', 'ataxies', 'atelier', 'atemoya', 'atheism', 'atheist', 'atheling', 'athirst', 'athlete', 'athodyd', 'athwart', 'atingle', 'atlases', 'atlatls', 'atomics', 'atomies', 'atomise', 'atomism', 'atomist', 'atomize', 'atoners', 'atonias', 'atonics', 'atonies', 'atoning', 'atopies', 'atresia', 'atresic', 'atretic', 'atriums', 'atrophy', 'atropin', 'attaboy', 'attache', 'attacks', 'attains', 'attaint', 'attempt', 'attends', 'attent', 'attest', 'attests', 'attired', 'attires', 'attorns', 'attract', 'attrite', 'attrits', 'attuned', 'attunes', 'atw', 'atypic', 'aubades', 'auberge', 'aubretia', 'auction', 'aucubas', 'audible', 'audibly', 'audient', 'audiles', 'audings', 'audited', 'auditee', 'auditor', 'augends', 'augites', 'augitic', 'augment', 'augural', 'augured', 'augurer', 'auguste', 'augusts', 'auklets', 'auldest', 'aunties', 'aurally', 'aurated', 'aureate', 'aurelia', 'aureola', 'aureole', 'auricle', 'aurists', 'aurochs', 'aurorae', 'auroral', 'auroras', 'ausform', 'auspice', 'austere', 'austral', 'ausubos', 'autarch', 'autarky', 'autecology', 'auteurs', 'authors', 'autisms', 'autists', 'autoing', 'automat', 'autonym', 'autopsy', 'autosome', 'autotomy', 'autumn', 'autumns', 'auxeses', 'auxesis', 'auxetic', 'auxinic', 'availed', 'avails', 'avarice', 'avatars', 'avaunts', 'avellan', 'avenged', 'avenger', 'avenges', 'avenses', 'avenues', 'average', 'averred', 'aversed', 'averses', 'averted', 'averter', 'avgases', 'aviated', 'aviates', 'aviatic', 'aviator', 'avidins', 'avidity', 'avionic', 'aviso', 'avisos', 'avocado', 'avocets', 'avodire', 'avoided', 'avoider', 'avosets', 'avouched', 'avoucher', 'avowals', 'avowers', 'avowing', 'avulsed', 'avulses', 'awaited', 'awaiter', 'awakens', 'awaking', 'awarded', 'awardee', 'awarder', 'aweless', 'awesome', 'awfully', 'awhaped', 'awhapes', 'awkward', 'awlwort', 'awnings', 'awnless', 'axe', 'axebird', 'axially', 'axillae', 'axillar', 'axillas', 'axolotl', 'axoneme', 'axseeds', 'azaleas', 'azimuth', 'azotemia', 'azotise', 'azotize', 'azulejo', 'azurite', 'azygous']
};

// Populate guess lists
for (const length of [3, 4, 5, 6, 7]) {
  const combined = [...new Set([...WORD_LISTS[length].answer, ...additionalGuessWords[length]])].sort();
  WORD_LISTS[length].guess = combined;
}

// Calculate letter frequencies for each length
function calculateFrequencies(words: string[], length: number) {
  const letterFreq: Record<string, { total: number; positions: number[] }> = {};

  // Initialize
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(97 + i);
    letterFreq[letter] = {
      total: 0,
      positions: new Array(length).fill(0)
    };
  }

  // Count frequencies
  for (const word of words) {
    const counted = new Set<string>();
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      letterFreq[letter].positions[i]++;
      if (!counted.has(letter)) {
        letterFreq[letter].total++;
        counted.add(letter);
      }
    }
  }

  return letterFreq;
}

// Save word lists and frequencies
for (const [lengthStr, lists] of Object.entries(WORD_LISTS)) {
  const length = parseInt(lengthStr) as 3 | 4 | 5 | 6 | 7;

  // Save answer list
  const answerPath = path.join(WORDS_DIR, `${length}-letters-answer.txt`);
  fs.writeFileSync(answerPath, lists.answer.join('\n'));
  console.log(`✓ Created ${length}-letter answer list: ${lists.answer.length} words`);

  // Save guess list
  const guessPath = path.join(WORDS_DIR, `${length}-letters-guess.txt`);
  fs.writeFileSync(guessPath, lists.guess.join('\n'));
  console.log(`✓ Created ${length}-letter guess list: ${lists.guess.length} words`);

  // Calculate and save frequencies
  const frequencies = calculateFrequencies(lists.answer, length);
  const freqPath = path.join(FREQ_DIR, `${length}-letters-freq.json`);
  fs.writeFileSync(freqPath, JSON.stringify(frequencies, null, 2));
  console.log(`✓ Created ${length}-letter frequency data`);
}

console.log('\n✅ Word lists preparation complete!');
console.log('\nSummary:');
for (const [length, lists] of Object.entries(WORD_LISTS)) {
  console.log(`  ${length} letters: ${lists.answer.length} answer words, ${lists.guess.length} total valid guesses`);
}
