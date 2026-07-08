/**
 * matchingEngine.js
 *
 * Local matching engine (browser-side) based on a ridge-regression model.
 * Provides:
 * - calculateCompatibility(elder, orphan) -> number in [0, 1]
 * - generateMatchesLocal(orphanId, allOrphans, allElders) -> MatchResult[]
 * - autoMatchAllLocal(allOrphans, allElders) -> MatchResult[]
 */

const MODEL = {
  weights: [
    0.0003173528628703177, 0.05715147039487626, 0.0362116877507491,
    0.0014136816982568445, 0.051022759619588284, 0.028635674792434875,
    0.030009341085850343, 0.04943652881381388, 0.04733832991202547,
    0.015543829016479114,
  ],
  bias: 0.5270799999999999,
  mu: [
    57.32, 0.558, 0.5516, 0.6582, 0.2353, 0.7015, 0.5501, 0.825, 0.362, 0.5708,
  ],
  sigma: [
    6.8741, 0.3737, 0.2507, 0.2414, 0.2511, 0.2855, 0.2652, 0.3254, 0.4806, 0.3252,
  ],
};

function asList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter((s) => s.trim());
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function maybeNumber(value) {
  if (value == null) return null;
  const n = Number(value);
  return isNaN(n) || n < 0 ? null : n;
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  a.forEach((v) => {
    if (b.has(v)) intersection++;
  });
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function normComm(comm) {
  if (!comm) return null;
  const c = String(comm).trim().toLowerCase();
  if (!c) return null;
  if (['talkative', 'verbal'].includes(c)) return 'verbal';
  if (['reserved', 'non-verbal', 'nonverbal'].includes(c)) return 'non-verbal';
  if (['balanced', 'mixed'].includes(c)) return 'mixed';
  return c;
}

function extractFeatures(profile) {
  const interests = new Set(asList(profile?.hobbies || profile?.interests));
  const languages = new Set(asList(profile?.languages || (profile?.language ? [profile?.language] : [])));

  const safeStr = (v) => (v == null ? '' : String(v).trim());
  const personality = safeStr(profile?.personality || profile?.personalityType).toLowerCase() || null;
  const communication = normComm(profile?.communication || profile?.communicationStyle);
  const availability = maybeNumber(profile?.availability);
  const age = maybeNumber(profile?.age);
  const attachmentStyle =
    safeStr(profile?.attachmentStyle || profile?.attachment_style).toLowerCase() || null;
  const healthCondition =
    safeStr(profile?.healthCondition || profile?.health_condition).toLowerCase() || null;
  const traumaLevel =
    safeStr(profile?.traumaLevel || profile?.trauma_level).toLowerCase() || null;
  const patienceLevel =
    safeStr(profile?.patienceLevel || profile?.patience_level).toLowerCase() || null;

  const allowedStates = ['calm', 'anxious', 'sad', 'happy', 'neutral', 'irritated', 'stable'];
  let emotionalState = (profile?.emotionalState || profile?.emotional_state || '').toLowerCase();
  if (!allowedStates.includes(emotionalState)) emotionalState = 'neutral';

  return {
    id: profile?.id || null,
    age,
    interests,
    languages,
    emotionalState,
    personality,
    communication,
    availability,
    attachmentStyle,
    healthCondition,
    traumaLevel,
    patienceLevel,
  };
}

function personalityMatch(e, o) {
  if (!e || !o) return 0;
  if (e === o) return 1;
  if (e === 'ambivert' || o === 'ambivert') return 0.5;
  return 0;
}

function emotionalCompatibility(e, o) {
  const es = e.emotionalState;
  const os = o.emotionalState;
  if (es === os) return 1;
  if (es === 'stable' || os === 'stable') return 0.7;
  if ((es === 'anxious' && os === 'calm') || (es === 'calm' && os === 'anxious')) return 0.8;
  return 0.4;
}

function communicationMatch(e, o) {
  const ce = e.communication;
  const co = o.communication;
  if (!ce || !co) return 0.5;
  if (ce === co) return 1;
  if (ce === 'mixed' || co === 'mixed') return 0.75;
  if ((ce === 'verbal' && co === 'non-verbal') || (ce === 'non-verbal' && co === 'verbal')) return 0.25;
  return 0.5;
}

function availabilityOverlap(e, o) {
  const ae = e.availability;
  const ao = o.availability;
  if (ae == null || ao == null || ae <= 0 || ao <= 0) return 0;
  const mn = Math.min(ae, ao);
  const mx = Math.max(ae, ao);
  return mx > 0 ? mn / mx : 0;
}

function supportCompatibility(e, o) {
  const traumaMap = { none: 0, mild: 1, moderate: 2, severe: 3 };
  const patienceMap = { low: 1, medium: 2, high: 3 };
  const t = o.traumaLevel;
  const p = e.patienceLevel;
  if (!t || !p || !(t in traumaMap) || !(p in patienceMap)) return 0;
  const tv = traumaMap[t];
  const pv = patienceMap[p];
  if (pv >= tv) return 1;
  if (pv === tv - 1) return 0.5;
  return 0;
}

function attachmentCompatibility(e, o) {
  const a1 = o.attachmentStyle;
  const a2 = e.attachmentStyle;
  if (!a1 || !a2) return 0.5;
  if (a1 === a2) return 1;
  if (a1 === 'secure' || a2 === 'secure') return 0.8;
  if ((a1 === 'anxious' && a2 === 'avoidant') || (a1 === 'avoidant' && a2 === 'anxious')) return 0.2;
  return 0.5;
}

function healthFactor(e) {
  return ({ good: 1, moderate: 0.5, critical: 0.2 }[e.healthCondition || ''] ?? 0.5);
}

function languageMatch(e, o) {
  if (!e.languages.size || !o.languages.size) return 0;
  let overlap = false;
  e.languages.forEach((l) => {
    if (o.languages.has(l)) overlap = true;
  });
  return overlap ? 1 : 0;
}

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function buildFeatureVector(elderF, orphanF) {
  const ageGap = Math.abs((elderF.age || 0) - (orphanF.age || 0));
  return [
    ageGap,
    personalityMatch(elderF.personality, orphanF.personality),
    emotionalCompatibility(elderF, orphanF),
    attachmentCompatibility(elderF, orphanF),
    jaccard(elderF.interests, orphanF.interests),
    communicationMatch(elderF, orphanF),
    availabilityOverlap(elderF, orphanF),
    supportCompatibility(elderF, orphanF),
    languageMatch(elderF, orphanF),
    healthFactor(elderF),
  ];
}

function mlPredict(featureVector) {
  let result = MODEL.bias;
  for (let i = 0; i < featureVector.length; i++) {
    const sigma = MODEL.sigma[i] || 1;
    const normalized = (featureVector[i] - MODEL.mu[i]) / sigma;
    result += normalized * MODEL.weights[i];
  }
  return clamp01(result);
}

function generateReason(elderF, orphanF) {
  const reasons = [];

  if (personalityMatch(elderF.personality, orphanF.personality) >= 0.5) {
    reasons.push('compatible personalities');
  }
  if (jaccard(elderF.interests, orphanF.interests) > 0) {
    const shared = [...elderF.interests].filter((i) => orphanF.interests.has(i));
    reasons.push(`shared interests: ${shared.join(', ')}`);
  }
  if (languageMatch(elderF, orphanF) === 1) reasons.push('common language');
  if (emotionalCompatibility(elderF, orphanF) >= 0.7) reasons.push('emotional harmony');
  if (supportCompatibility(elderF, orphanF) >= 0.5) reasons.push('good support fit');

  return reasons.length ? reasons.join(' • ') : 'baseline compatibility';
}

export function calculateCompatibility(elder, orphan) {
  const elderF = extractFeatures(elder);
  const orphanF = extractFeatures(orphan);
  const vec = buildFeatureVector(elderF, orphanF);
  return mlPredict(vec);
}

export function buildMatchResult(elder, orphan) {
  const elderF = extractFeatures(elder);
  const orphanF = extractFeatures(orphan);
  const vec = buildFeatureVector(elderF, orphanF);
  const score = mlPredict(vec);

  return {
    id: `${elder?.id || 'elder'}-${orphan?.id || 'orphan'}`,
    elderId: elder?.id || '',
    elderName: elder?.name || elder?.fullName || 'Elder',
    orphanId: orphan?.id || '',
    orphanName: orphan?.name || orphan?.fullName || 'Orphan',
    compatibilityScore: Math.round(score * 10000) / 10000,
    reason: generateReason(elderF, orphanF),
    interests: [...elderF.interests],
  };
}

export function generateMatchesLocal(orphanId, allOrphans, allElders) {
  const orphan = allOrphans.find((o) => o.id === orphanId);
  if (!orphan) return [];

  return allElders
    .map((elder) => buildMatchResult(elder, orphan))
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}

export function autoMatchAllLocal(allOrphans, allElders) {
  if (!allOrphans.length || !allElders.length) return [];

  const orphansF = allOrphans.map((o) => ({ features: extractFeatures(o), raw: o }));
  const matched = new Set();
  const results = [];

  for (const elder of allElders) {
    const elderF = extractFeatures(elder);

    let bestScore = -1;
    let bestOrphanEntry = null;

    for (const orphanEntry of orphansF) {
      const oid = orphanEntry.raw.id;
      if (!oid) continue;
      if (matched.has(oid)) continue;
      const vec = buildFeatureVector(elderF, orphanEntry.features);
      const score = mlPredict(vec);

      if (score > bestScore) {
        bestScore = score;
        bestOrphanEntry = orphanEntry;
      }
    }

    if (bestOrphanEntry && bestOrphanEntry.raw.id && elder.id) {
      matched.add(bestOrphanEntry.raw.id);
      results.push({
        id: `${elder.id}-${bestOrphanEntry.raw.id}`,
        elderId: elder.id,
        elderName: elder.name || elder.fullName || 'Elder',
        orphanId: bestOrphanEntry.raw.id,
        orphanName: bestOrphanEntry.raw.name || bestOrphanEntry.raw.fullName || 'Orphan',
        compatibilityScore: Math.round(bestScore * 10000) / 10000,
        reason: generateReason(elderF, bestOrphanEntry.features),
        interests: [...elderF.interests],
      });
    }
  }

  return results.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
}
