import csv
import random
import os

# ----------------------------
# PATH SETUP
# ----------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "dataset.csv")

# ----------------------------
# DATA OPTIONS
# ----------------------------

personalities = ["introvert", "ambivert", "extrovert"]
orphan_emotions = ["calm", "anxious", "sad", "happy", "neutral", "irritated"]
elder_emotions = ["calm", "anxious", "sad", "happy", "neutral", "irritated"]

attachment_styles = ["secure", "avoidant", "ambivalent", "disorganized", "anxious"]
communication_styles = ["verbal", "non-verbal", "mixed"]

trauma_levels = ["none", "mild", "moderate", "severe"]
patience_levels = ["low", "medium", "high"]

health_conditions = ["good", "moderate", "critical"]
languages = ["hindi", "english", "regional"]

interests_pool = [
    "music",
    "art",
    "stories",
    "games",
    "nature",
    "reading"
]

# ----------------------------
# HELPER FUNCTIONS
# ----------------------------

def interest_similarity(i1, i2):
    common = len(set(i1) & set(i2))
    total = len(set(i1) | set(i2))
    return common / total if total else 0

def personality_match(p1, p2):
    if p1 == p2:
        return 1
    if "ambivert" in [p1, p2]:
        return 0.5
    return 0

def communication_match(c1, c2):
    # Perfect match
    if c1 == c2:
        return 1

    # Mixed works well with both
    if "mixed" in [c1, c2]:
        return 0.75

    # Verbal vs non-verbal mismatch
    if (c1 == "verbal" and c2 == "non-verbal") or (c1 == "non-verbal" and c2 == "verbal"):
        return 0.25

    return 0.5

def language_match(l1, l2):
    return 1 if l1 == l2 else 0

def availability_overlap(a1, a2):
    return min(a1, a2) / max(a1, a2)

def support_compatibility(trauma, patience):
    mapping = {
        "none": 0,
        "mild": 1,
        "moderate": 2,
        "severe": 3
    }

    patience_map = {"low": 1, "medium": 2, "high": 3}

    t = mapping[trauma]
    p = patience_map[patience]

    if p >= t:
        return 1
    elif p == t - 1:
        return 0.5
    else:
        return 0

def health_factor(h):
    return {"good": 1, "moderate": 0.5, "critical": 0.2}[h]

# ----------------------------
# GENERATE DATASET
# ----------------------------

def generate_dataset(rows_count=500):

    rows = []

    for _ in range(rows_count):

        # ORPHAN PROFILE
        o_age = random.randint(8, 17)
        o_personality = random.choice(personalities)
        o_emotion = random.choice(orphan_emotions)
        o_attachment = random.choice(attachment_styles)
        o_comm = random.choice(communication_styles)
        o_trauma = random.choice(trauma_levels)
        o_lang = random.choice(languages)
        o_availability = random.randint(1, 15)
        o_interests = random.sample(interests_pool, 2)

        # ELDER PROFILE
        e_age = random.randint(60, 80)
        e_personality = random.choice(personalities)
        e_emotion = random.choice(elder_emotions)
        e_attachment = random.choice(attachment_styles)
        e_comm = random.choice(communication_styles)
        e_patience = random.choice(patience_levels)
        e_health = random.choice(health_conditions)
        e_lang = random.choice(languages)
        e_availability = random.randint(5, 20)
        e_interests = random.sample(interests_pool, 2)

        # FEATURE ENGINEERING
        age_gap = abs(e_age - o_age)
        interest_sim = interest_similarity(o_interests, e_interests)
        p_match = personality_match(o_personality, e_personality)
        c_match = communication_match(o_comm, e_comm)
        lang_match = language_match(o_lang, e_lang)
        avail_overlap = availability_overlap(o_availability, e_availability)
        support_comp = support_compatibility(o_trauma, e_patience)
        h_factor = health_factor(e_health)

        def emotional_compatibility(e1, e2):
            if e1 == e2:
                return 1
            if "stable" in [e1, e2]:
                return 0.7
            if "anxious" in [e1, e2] and "calm" in [e1, e2]:
                return 0.8
            return 0.4
        emotional_comp = emotional_compatibility(o_emotion, e_emotion)
        def attachment_compatibility(a1, a2):
            if a1 == a2:
                return 1
            if "secure" in [a1, a2]:
                return 0.8
            if "anxious" in [a1, a2] and "avoidant" in [a1, a2]:
                return 0.2
            return 0.5
        attachment_comp = attachment_compatibility(o_attachment, e_attachment)

        # FINAL COMPATIBILITY SCORE
        score = (
            0.2 * interest_sim +
            0.15 * p_match +
            0.15 * emotional_comp +
            0.1 * c_match +
            0.1 * avail_overlap +
            0.15 * support_comp +
            0.1 * lang_match +
            0.05 * h_factor
        )
        score += random.uniform(-0.05, 0.05)
        score = max(0, min(score, 1))

        
        score = max(0, min(score, 1))  # clamp between 0-1

        rows.append([
            o_age, e_age, age_gap,
            o_personality, e_personality, p_match,
            o_emotion, e_emotion, emotional_comp,
            o_attachment, e_attachment, attachment_comp,
            interest_sim,
            o_comm, e_comm, c_match,
            avail_overlap,
            o_trauma, e_patience, support_comp,
            e_health,
            lang_match,
            round(score, 2)
        ])

    header = [
        "orphan_age", "elder_age", "age_gap",
        "orphan_personality", "elder_personality", "personality_match",
        "orphan_emotional_state", "elder_emotional_state", "emotional_compatibility",
        "orphan_attachment_style", "elder_attachment_style", "attachment_compatibility",
        "interest_similarity",
        "orphan_communication", "elder_communication", "communication_match",
        "availability_overlap",
        "orphan_trauma_level", "elder_patience_level", "support_compatibility",
        "elder_health_condition",
        "language_match",
        "compatibility_score"
    ]

    os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)

    with open(DATASET_PATH, "w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(header)
        writer.writerows(rows)

    print(f"Dataset generated successfully at: {DATASET_PATH}")

# ----------------------------
# RUN
# ----------------------------

if __name__ == "__main__":
    generate_dataset(500)
