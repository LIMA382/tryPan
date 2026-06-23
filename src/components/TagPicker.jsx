'use client';

import { useMemo, useState } from 'react';
import { PRESET_TAGS, TAG_GROUPS, normalizeTags } from '@/lib/tagCatalog';

export default function TagPicker({ value = [], onChange }) {
  const [custom, setCustom] = useState('');
  const tags = useMemo(() => normalizeTags(value), [value]);

  function toggle(tag) {
    const exists = tags.some((item) => item.toLowerCase() === tag.toLowerCase());
    onChange(exists ? tags.filter((item) => item.toLowerCase() !== tag.toLowerCase()) : [...tags, tag]);
  }

  function addCustom() {
    const clean = custom.trim();
    if (!clean) return;
    if (!tags.some((item) => item.toLowerCase() === clean.toLowerCase())) {
      onChange([...tags, clean]);
    }
    setCustom('');
  }

  return (
    <div className="tag-picker">
      {TAG_GROUPS.map((group) => (
        <div className="tag-group" key={group.label}>
          <span>{group.label}</span>
          <div className="tag-chip-row">
            {group.tags.map((tag) => {
              const active = tags.some((item) => item.toLowerCase() === tag.toLowerCase());
              return (
                <button type="button" key={tag} className={`tag-chip ${active ? 'active' : ''}`} onClick={() => toggle(tag)}>
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="custom-tag-row">
        <input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Add custom tag…" />
        <button type="button" className="soft-btn" onClick={addCustom}>Add</button>
      </div>

      <div className="selected-tags-row">
        {tags.map((tag) => (
          <button type="button" key={tag} className="selected-tag" onClick={() => toggle(tag)}>
            {tag} ×
          </button>
        ))}
        {!tags.length && <small>No tags selected yet.</small>}
      </div>
    </div>
  );
}
