/**
 * sentimentEngine.js
 *
 * Browser-side sentiment analysis for session transcripts.
 * Uses lexicon-based polarity analysis (no external API needed).
 *
 * Provides:
 * - analyzeTranscript(transcript, compatibilityScore?) -> SentimentReport
 */

const POSITIVE_WORDS = new Set([
  'love',
  'loved',
  'loving',
  'lovely',
  'happy',
  'happiness',
  'joy',
  'joyful',
  'wonderful',
  'great',
  'good',
  'nice',
  'kind',
  'warm',
  'caring',
  'sweet',
  'beautiful',
  'amazing',
  'awesome',
  'fantastic',
  'excellent',
  'brilliant',
  'enjoy',
  'enjoyed',
  'enjoying',
  'fun',
  'funny',
  'laugh',
  'laughed',
  'smile',
  'smiled',
  'smiling',
  'grateful',
  'thankful',
  'appreciate',
  'friend',
  'friendship',
  'together',
  'connect',
  'connected',
  'comfort',
  'comfortable',
  'safe',
  'trust',
  'trusted',
  'hope',
  'hopeful',
  'positive',
  'excited',
  'exciting',
  'interesting',
  'interested',
  'helpful',
  'gentle',
  'patient',
  'peaceful',
  'calm',
  'relaxed',
  'cheerful',
  'delightful',
  'proud',
  'inspired',
  'inspiring',
  'motivating',
  'encouraged',
  'supported',
  'welcome',
  'blessed',
  'fortunate',
  'charming',
  'heartfelt',
  'tender',
  'like',
  'liked',
  'best',
  'better',
  'favorite',
  'special',
  'meaningful',
  'story',
  'stories',
  'share',
  'shared',
  'sharing',
  'reminisce',
  'remember',
  'memories',
  'memory',
  'learn',
  'learned',
  'teach',
  'taught',
  'listen',
  'listened',
  'understand',
  'understood',
  'empathy',
]);

const NEGATIVE_WORDS = new Set([
  'sad',
  'sadness',
  'unhappy',
  'angry',
  'anger',
  'hate',
  'hated',
  'horrible',
  'terrible',
  'awful',
  'bad',
  'worse',
  'worst',
  'ugly',
  'boring',
  'bored',
  'lonely',
  'alone',
  'scared',
  'afraid',
  'fear',
  'worried',
  'worry',
  'anxious',
  'anxiety',
  'stressed',
  'stress',
  'frustrated',
  'frustrating',
  'annoyed',
  'annoying',
  'disappointed',
  'disappointing',
  'hurt',
  'hurting',
  'pain',
  'painful',
  'cry',
  'cried',
  'crying',
  'miss',
  'missed',
  'missing',
  'lost',
  'loss',
  'grief',
  'depressed',
  'depression',
  'hopeless',
  'helpless',
  'confused',
  'uncomfortable',
  'difficult',
  'hard',
  'struggle',
  'struggling',
  'tired',
  'exhausted',
  'sick',
  'ill',
  'weak',
  'broken',
  'silent',
  'ignore',
  'ignored',
  'reject',
  'rejected',
  'abandon',
  'abandoned',
  'neglect',
  'neglected',
  'trauma',
  'suffer',
  'suffering',
]);

const INTENSIFIERS = new Set([
  'very',
  'really',
  'extremely',
  'incredibly',
  'absolutely',
  'truly',
  'so',
  'quite',
  'super',
  'deeply',
  'highly',
  'totally',
]);

const NEGATORS = new Set([
  'not',
  'no',
  'never',
  'neither',
  'nor',
  "don't",
  "doesn't",
  "didn't",
  "won't",
  "wouldn't",
  "couldn't",
  "shouldn't",
  "isn't",
  "aren't",
  "wasn't",
  "weren't",
  'cannot',
  "can't",
  'hardly',
  'barely',
]);

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z'\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function computePolarity(tokens) {
  let score = 0;
  let opinionatedWords = 0;
  let negated = false;
  let intensified = false;

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i];

    if (NEGATORS.has(word)) {
      negated = true;
      continue;
    }

    if (INTENSIFIERS.has(word)) {
      intensified = true;
      continue;
    }

    let wordScore = 0;
    if (POSITIVE_WORDS.has(word)) {
      wordScore = 1;
      opinionatedWords++;
    } else if (NEGATIVE_WORDS.has(word)) {
      wordScore = -1;
      opinionatedWords++;
    }

    if (wordScore !== 0) {
      if (negated) wordScore *= -0.75;
      if (intensified) wordScore *= 1.5;
    }

    score += wordScore;
    negated = false;
    intensified = false;
  }

  const totalWords = tokens.length || 1;
  const polarity = Math.max(-1, Math.min(1, score / Math.sqrt(totalWords)));
  const subjectivity = Math.min(1, (opinionatedWords / totalWords) * 2);

  return { polarity, subjectivity };
}

function computeEngagement(tokens, polarity, subjectivity) {
  // Factors: transcript length, sentiment strength, subjectivity, variety
  const lengthFactor = Math.min(1, tokens.length / 150); // ~150 words = full engagement
  const sentimentStrength = Math.abs(polarity);
  const uniqueRatio = new Set(tokens).size / (tokens.length || 1);
  const varietyFactor = Math.min(1, uniqueRatio * 1.5);

  const engagement =
    lengthFactor * 0.3 +
    sentimentStrength * 0.25 +
    subjectivity * 0.25 +
    varietyFactor * 0.2;

  return Math.round(Math.max(0, Math.min(1, engagement)) * 100) / 100;
}

function mapEmotion(polarity) {
  if (polarity > 0.1) return 'happy';
  if (polarity < -0.1) return 'sad';
  return 'neutral';
}

function mapRecommendation(engagementScore) {
  if (engagementScore > 0.7) return 'continue';
  if (engagementScore >= 0.4) return 'reconsider';
  return 'rematch';
}

function generateReason(emotion, engagementScore, recommendation) {
  if (recommendation === 'continue') {
    return 'Strong emotional connection and engagement detected. The pair shows positive bonding signals.';
  }
  if (recommendation === 'reconsider') {
    return 'Moderate interaction observed. The relationship may improve with more sessions and guidance.';
  }
  return 'Low engagement detected. Consider alternative pairing for better emotional outcomes.';
}

export function analyzeTranscript(transcript, compatibilityScore) {
  const tokens = tokenize(transcript);
  const { polarity, subjectivity } = computePolarity(tokens);
  const engagementScore = computeEngagement(tokens, polarity, subjectivity);
  const emotion = mapEmotion(polarity);
  const reconnectRecommendation = mapRecommendation(engagementScore);

  const compatScore = compatibilityScore ?? 0.5;
  const bondStrength = Math.round(((compatScore + engagementScore) / 2) * 100) / 100;

  const reason = generateReason(emotion, engagementScore, reconnectRecommendation);

  return {
    emotion,
    engagementScore,
    reconnectRecommendation,
    bondStrength,
    reason,
    polarity: Math.round(polarity * 100) / 100,
    subjectivity: Math.round(subjectivity * 100) / 100,
  };
}

