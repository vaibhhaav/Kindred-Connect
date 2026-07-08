import React, { useMemo, useState } from 'react';
import { useUser } from '../context/UserContext.jsx';
import {
  addProfileDocument,
  getAgeConstraintsForInstitution,
  INSTITUTION_TYPES,
  normalizeAgeByInstitutionType,
} from '../services/firestoreAdmin.js';

const interestOptions = ['music', 'art', 'stories', 'games', 'nature', 'reading'];
const personalityOptions = ['introvert', 'ambivert', 'extrovert'];
const communicationOptions = ['verbal', 'non-verbal', 'mixed'];
const emotionalStateOptions = ['calm', 'anxious', 'sad', 'happy', 'neutral', 'irritated'];
const attachmentOptions = ['secure', 'avoidant', 'ambivalent', 'disorganized', 'anxious'];
const availabilityOptions = ['morning', 'afternoon', 'evening'];
const traumaLevelOptions = ['none', 'mild', 'moderate', 'severe'];
const languageOptions = ['english', 'hindi', 'regional'];
const patienceLevelOptions = ['low', 'medium', 'high'];
const healthConditionOptions = ['good', 'moderate', 'critical'];

const initialForm = {
  name: '',
  age: '',
  gender: '',
  personalityType: '',
  emotionalState: '',
  attachmentStyle: '',
  interests: [],
  communicationStyle: '',
  availability: '',
  traumaLevel: '',
  language: '',
  patienceLevel: '',
  healthCondition: '',
};

export default function ProfileForm({ open, onClose, onSaved, loading: loadingProp }) {
  const { userId, institutionId, institutionType } = useUser();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const isElder = institutionType === INSTITUTION_TYPES.OLDAGE;
  const ageConstraints = useMemo(
    () => getAgeConstraintsForInstitution(institutionType),
    [institutionType],
  );
  const title = useMemo(
    () => (isElder ? 'Add Elder Profile' : 'Add Orphan Profile'),
    [isElder],
  );

  if (!open) return null;

  const updateField = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const clampAgeInput = () => {
    if (form.age === '') return;

    try {
      const normalizedAge = normalizeAgeByInstitutionType(institutionType, form.age);
      setForm((prev) => ({ ...prev, age: String(normalizedAge) }));
    } catch {
      // Keep the user's input until submit validation handles it.
    }
  };

  const toggleInterest = (value) => {
    setForm((prev) => {
      const exists = prev.interests.includes(value);
      return {
        ...prev,
        interests: exists
          ? prev.interests.filter((i) => i !== value)
          : [...prev.interests, value],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!userId || !institutionId || !institutionType) {
      setError('Institution is not set up.');
      return;
    }

    const required = [
      'name',
      'age',
      'gender',
      'personalityType',
      'emotionalState',
      'attachmentStyle',
      'communicationStyle',
      'availability',
      'language',
    ];
    if (!isElder) required.push('traumaLevel');
    if (isElder) required.push('patienceLevel', 'healthCondition');

    const missing = required.some((key) => !String(form[key]).trim());
    if (missing || form.interests.length === 0) {
      setError('Please complete all fields.');
      return;
    }

    const rawAge = Number(form.age);
    if (!Number.isFinite(rawAge)) {
      setError('Age must be a number.');
      return;
    }

    const normalizedAge = normalizeAgeByInstitutionType(institutionType, rawAge);

    const languages = [String(form.language).trim()];
    const payload = {
      name: String(form.name).trim(),
      age: normalizedAge,
      gender: String(form.gender).trim(),
      personalityType: String(form.personalityType).trim(),
      emotionalState: String(form.emotionalState).trim(),
      attachmentStyle: String(form.attachmentStyle).trim(),
      interests: [...form.interests],
      hobbies: [...form.interests],
      languages,
      language: languages[0],
      communicationStyle: String(form.communicationStyle).trim(),
      availability: String(form.availability).trim(),
      traumaLevel: isElder ? null : String(form.traumaLevel).trim(),
      patienceLevel: isElder ? String(form.patienceLevel).trim() : null,
      healthCondition: isElder ? String(form.healthCondition).trim() : null,
    };

    setSaving(true);
    try {
      await addProfileDocument({
        institutionType,
        institutionId,
        createdBy: userId,
        payload,
      });
      setForm(initialForm);
      setDropdownOpen(false);
      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || loadingProp;
  const inputStyle =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs text-slate-500">
          Profile type is set automatically from your institution ({institutionType}).
        </p>

        <form
          className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"
          onSubmit={handleSubmit}
        >
          <input
            name="name"
            placeholder="Name"
            value={form.name}
            onChange={updateField}
            className={inputStyle}
          />
          <input
            name="age"
            type="number"
            min={ageConstraints.min}
            max={ageConstraints.max}
            placeholder={`Age (${ageConstraints.min}-${ageConstraints.max})`}
            value={form.age}
            onChange={updateField}
            onBlur={clampAgeInput}
            className={inputStyle}
          />
          <p className="md:col-span-2 -mt-1 text-xs text-slate-500">
            {ageConstraints.label}. Values outside this range are automatically adjusted before saving.
          </p>
          <select
            name="gender"
            value={form.gender}
            onChange={updateField}
            className={inputStyle}
          >
            <option value="">Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <select
            name="personalityType"
            value={form.personalityType}
            onChange={updateField}
            className={inputStyle}
          >
            <option value="">Personality Type</option>
            {personalityOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            name="emotionalState"
            value={form.emotionalState}
            onChange={updateField}
            className={inputStyle}
          >
            <option value="">Emotional State</option>
            {emotionalStateOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            name="attachmentStyle"
            value={form.attachmentStyle}
            onChange={updateField}
            className={inputStyle}
          >
            <option value="">Attachment Style</option>
            {attachmentOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <div className="relative md:col-span-2">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`${inputStyle} text-left`}
            >
              {form.interests.length > 0
                ? form.interests.join(', ')
                : 'Select interests / hobbies'}
            </button>
            {dropdownOpen && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow">
                {interestOptions.map((item) => (
                  <label
                    key={item}
                    className="flex cursor-pointer items-center px-3 py-2 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={form.interests.includes(item)}
                      onChange={() => toggleInterest(item)}
                      className="mr-2"
                    />
                    {item}
                  </label>
                ))}
              </div>
            )}
          </div>

          <select
            name="communicationStyle"
            value={form.communicationStyle}
            onChange={updateField}
            className={inputStyle}
          >
            <option value="">Communication Style</option>
            {communicationOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            name="availability"
            value={form.availability}
            onChange={updateField}
            className={inputStyle}
          >
            <option value="">Availability</option>
            {availabilityOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <select
            name="language"
            value={form.language}
            onChange={updateField}
            className={inputStyle}
          >
            <option value="">Language</option>
            {languageOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          {!isElder && (
            <select
              name="traumaLevel"
              value={form.traumaLevel}
              onChange={updateField}
              className={inputStyle}
            >
              <option value="">Trauma Level</option>
              {traumaLevelOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          )}

          {isElder && (
            <>
              <select
                name="patienceLevel"
                value={form.patienceLevel}
                onChange={updateField}
                className={inputStyle}
              >
                <option value="">Patience Level</option>
                {patienceLevelOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <select
                name="healthCondition"
                value={form.healthCondition}
                onChange={updateField}
                className={inputStyle}
              >
                <option value="">Health Condition</option>
                {healthConditionOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </>
          )}

          {error && (
            <p className="md:col-span-2 text-xs text-red-600">{error}</p>
          )}

          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
