import { useState, useRef, useEffect, useId, useMemo } from 'react';
import './Select.css';

/**
 * groups: [{ label: 'Pregrado', options: [{ value: 'is', label: 'Ingeniería de Sistemas' }] }]
 * Para una lista simple, usa un solo grupo sin label: [{ options: [...] }]
 */
export default function Select({
  label,
  value,
  onChange,
  groups,
  placeholder = 'Selecciona…',
  searchableFrom = 8, // muestra buscador cuando hay 8 opciones o más
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const all = useMemo(() => groups.flatMap((g) => g.options), [groups]);
  const searchable = all.length >= searchableFrom;
  const selected = all.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .map((g) => ({ ...g, options: g.options.filter((o) => !q || o.label.toLowerCase().includes(q)) }))
      .filter((g) => g.options.length);
  }, [groups, query]);
  const flat = useMemo(() => filtered.flatMap((g) => g.options), [filtered]);

  const openList = () => {
    setQuery('');
    setActive(Math.max(0, all.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  };
  const choose = (opt) => {
    if (!opt) return;
    onChange(opt.value);
    close();
  };

  // Foco al abrir
  useEffect(() => {
    if (open) (searchable ? inputRef.current : listRef.current)?.focus();
  }, [open, searchable]);

  // Mantener visible la opción activa
  useEffect(() => {
    if (open) document.getElementById(`${id}-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, id]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) close(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const onKeyDown = (e) => {
    const last = flat.length - 1;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, last)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
    else if (e.key === 'End') { e.preventDefault(); setActive(last); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(flat[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') close(false);
  };

  let idx = -1; // índice global para ids y estado activo

  return (
    <div className={`sel${open ? ' is-open' : ''}`} ref={rootRef}>
      <span className="sel-label" id={`${id}-label`}>{label}</span>

      <button
        type="button"
        ref={btnRef}
        className="sel-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); openList(); } }}
      >
        <span id={`${id}-value`} className={`sel-value${selected ? '' : ' is-placeholder'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className="sel-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="sel-panel">
          {searchable && (
            <input
              ref={inputRef}
              className="sel-search"
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={`${id}-list`}
              aria-activedescendant={flat.length ? `${id}-opt-${active}` : undefined}
              aria-label={`Buscar en ${label}`}
              placeholder="Buscar…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={onKeyDown}
            />
          )}

          <div
            ref={listRef}
            id={`${id}-list`}
            className="sel-list"
            role="listbox"
            aria-labelledby={`${id}-label`}
            tabIndex={searchable ? -1 : 0}
            aria-activedescendant={!searchable && flat.length ? `${id}-opt-${active}` : undefined}
            onKeyDown={searchable ? undefined : onKeyDown}
          >
            {filtered.map((g, gi) => (
              <div key={gi} role="group" aria-label={g.label}>
                {g.label && <div className="sel-group-label" aria-hidden="true">{g.label}</div>}
                {g.options.map((o) => {
                  idx += 1;
                  const i = idx;
                  const isSel = o.value === value;
                  return (
                    <div
                      key={o.value}
                      id={`${id}-opt-${i}`}
                      role="option"
                      aria-selected={isSel}
                      className={`sel-opt${i === active ? ' is-active' : ''}`}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(o)}
                    >
                      <span>{o.label}</span>
                      {isSel && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {flat.length === 0 && <div className="sel-empty">Sin resultados</div>}
          </div>
        </div>
      )}
    </div>
  );
}
