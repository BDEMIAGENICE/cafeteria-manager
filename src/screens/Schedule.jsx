import { useState } from 'react';
import Dialog from '../Dialog.jsx';
import { WEEKDAYS } from '../api.js';
import { useT } from '../i18n.jsx';
import { formatDay, todayKey, parseDateKey, dateKey, servicesFrom } from '../dates.js';
import Unavailable from './Unavailable.jsx';
import Michel from '../Michel.jsx';

// "12:15–13:45" -> ["12:15", "13:45"]
const splitTime = (label) => {
  const m = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/.exec(label || '');
  return m ? [`${m[1].padStart(2, '0')}:${m[2]}`, `${m[3].padStart(2, '0')}:${m[4]}`] : ['12:15', '13:30'];
};
const joinTime = (start, end) => `${start}–${end}`;

// "9 Nov" / "9 nov." (with the year when asked).
const shortDate = (date, lang, withYear) =>
  new Date(Date.UTC(date.y, date.m - 1, date.d)).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    ...(withYear && { year: 'numeric' }),
    timeZone: 'UTC',
  });

// What a form of seven weekday rows (the usual hours, or one week's plan) holds: the open
// days as [{ weekday, time_label, needed }], or the error to show.
function readWeek(d, t) {
  const rows = [];
  for (let i = 0; i < 7; i++) {
    const weekday = i + 1;
    if (!d.get(`open-${weekday}`)) continue;
    const start = d.get(`start-${weekday}`);
    const end = d.get(`end-${weekday}`);
    if (!start || !end || end <= start) {
      return { error: t('{day}: the shift must end after it starts.', { day: t(WEEKDAYS[i]) }) };
    }
    rows.push({ weekday, time_label: joinTime(start, end), needed: Number(d.get(`needed-${weekday}`)) || 1 });
  }
  return { rows };
}

// One service a day at most, identified by its date. Each week has its own days: the plan an
// admin gave it, or the usual hours when it has none. An admin can also close a single date
// or give it other hours.
export default function Schedule({ days, range, page, loadedPage, onPage, weekly, weeks, exceptions, staff, me, isAdmin, actions }) {
  const { t, lang } = useT();
  const [assigning, setAssigning] = useState(null); // a day
  const [editingDay, setEditingDay] = useState(null); // { day, closed, start, end, needed }
  const [editingWeek, setEditingWeek] = useState(false); // the usual hours
  const [planning, setPlanning] = useState(null); // a week of the page, being planned
  const [formError, setFormError] = useState(null);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [selected, setSelected] = useState(null); // date key of the day shown in detail

  const nameOf = new Map(staff.map((m) => [m.id, m.name]));
  const usualOf = (weekday) => weekly.find((w) => w.weekday === weekday);
  // What the week of a day plans for it: its own plan, or the usual hours when it has none.
  const baseOf = (day) => {
    const week = weeks.find((w) => day.key >= w.key && day.key <= w.end);
    return (week?.plan ?? weekly).find((r) => r.weekday === day.weekday);
  };
  // The unavailable-people popup only makes sense where calendar hints exist.
  const hasHints = days.some((d) => d.service && d.hints);

  const openDay = (day) => {
    setSelected(null);
    setFormError(null);
    const planned = baseOf(day);
    const [start, end] = splitTime(day.service?.time ?? planned?.time_label);
    setEditingDay({ day, closed: day.closed, start, end, needed: day.service?.needed ?? planned?.needed ?? 2 });
  };
  const openWeek = () => {
    setFormError(null);
    setEditingWeek(true);
  };
  const openPlan = (week) => {
    setFormError(null);
    setPlanning(week);
  };
  // How many people are placed on days of `week` that would no longer be open if its plan
  // became `plan` (a list of open days, or null for the usual hours).
  const confirmLoss = (lost) =>
    !lost || window.confirm(t('{n} people are placed on days this plan no longer opens. Continue anyway? They are placed again if those days reopen.', { n: lost }));
  const placedLost = (week, plan) => {
    const stays = new Set(
      servicesFrom(weekly, exceptions, week.start, 7, plan ? [{ week_start: week.key, days: plan }] : [])
        .filter((s) => !s.closed)
        .map((s) => s.key),
    );
    return days
      .filter((d) => d.key >= week.key && d.key <= week.end && d.service && !stays.has(d.key))
      .reduce((n, d) => n + d.service.assigned.length, 0);
  };

  return (
    <div className="screen-inner">
      <div className="page-head">
        <div className="page-intro">
          <Michel pose="megaphone" className="michel-head" />
          <div className="eyebrow">{t('Coming up')}</div>
          <h1 className="page-title">{t("Who's on the counter")}</h1>
          <p className="page-lede">{t('Shifts open for cover, and the people whose calendars are free.')}</p>
        </div>
        <div className="shift-actions">
          {hasHints && (
            <button className="btn btn-secondary" onClick={() => setShowUnavailable(true)}>
              {t('Who is unavailable')}
            </button>
          )}
          {isAdmin && (
            <button className="btn btn-primary" onClick={openWeek}>
              {t('Usual hours')}
            </button>
          )}
        </div>
      </div>

      {weekly.length === 0 && !days.some((d) => d.service || d.closed) && (
        <div className="card elev-sm" style={{ padding: 'var(--space-6)' }}>
          <p className="text-muted" style={{ margin: 0 }}>
            {isAdmin
              ? t('Nothing is planned yet. Plan a week from the calendar, or set the usual hours.')
              : t('No shifts have been planned yet.')}
          </p>
        </div>
      )}

      <Calendar
        days={days}
        range={range}
        weeks={weeks}
        hasUsual={weekly.length > 0}
        onPlan={openPlan}
        page={page}
        loading={page !== loadedPage}
        onPage={onPage}
        me={me}
        isAdmin={isAdmin}
        nameOf={nameOf}
        onOpen={setSelected}
      />

      {selected && (
        <DayDialog
          day={dayAt(days, selected)}
          me={me}
          isAdmin={isAdmin}
          nameOf={nameOf}
          onClose={() => setSelected(null)}
          onAssign={(day) => {
            setSelected(null);
            setAssigning(day);
          }}
          onEdit={openDay}
          onReopen={(day) => {
            setSelected(null);
            actions.clearServiceDay(day.key);
          }}
          onToggle={(day, mine) => actions.toggleSelf(day.key, mine)}
        />
      )}

      {showUnavailable && <Unavailable days={days} staff={staff} onClose={() => setShowUnavailable(false)} />}

      {assigning && (
        <Dialog
          title={`${formatDay(assigning.date, lang)} · ${assigning.service.time}`}
          submitLabel="Save"
          onClose={() => setAssigning(null)}
          onSubmit={(data) => {
            actions.assignService(assigning.key, data.getAll('staff').map(Number));
            setAssigning(null);
          }}
        >
          <p className="text-muted" style={{ margin: 0 }}>
            {t('Choose up to {n} people for this shift.', { n: assigning.service.needed })}
          </p>
          {staff.map((m) => (
            <label key={m.id} className="dialog-check">
              <input
                type="checkbox"
                name="staff"
                value={m.id}
                defaultChecked={assigning.service.assigned.includes(m.id)}
              />
              {m.name}
              {assigning.service.busy.includes(m.id) && <span className="tag tag-warn">{t('Busy')}</span>}
              {!assigning.service.busy.includes(m.id) && assigning.service.noClass.includes(m.id) && (
                <span className="tag tag-neutral">{t('No classes')}</span>
              )}
            </label>
          ))}
          <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>
            {t('Availability is only a hint: it never decides who works a shift.')}
          </p>
        </Dialog>
      )}

      {editingDay && (
        <Dialog
          title={formatDay(editingDay.day.date, lang)}
          submitLabel="Save"
          onClose={() => setEditingDay(null)}
          onSubmit={async (d) => {
            const { day } = editingDay;
            if (d.get('closed')) {
              const placed = day.service?.assigned.length ?? 0;
              if (placed && !window.confirm(t('{n} people are placed on this day. Close it anyway? They are placed again if the day reopens.', { n: placed }))) return;
              setEditingDay(null);
              await actions.setServiceDay(day.key, { closed: true, time_label: null, needed: null });
              return;
            }
            const start = d.get('start');
            const end = d.get('end');
            if (end <= start) {
              setFormError(t('The shift must end after it starts.'));
              return;
            }
            const time = joinTime(start, end);
            const needed = Number(d.get('needed'));
            const planned = baseOf(day);
            setEditingDay(null);
            // Same as what its week plans: no exception to keep for this date.
            if (planned && joinTime(...splitTime(planned.time_label)) === time && planned.needed === needed) {
              if (day.exception) await actions.clearServiceDay(day.key);
              return;
            }
            await actions.setServiceDay(day.key, { closed: false, time_label: time, needed });
          }}
        >
          <p className="text-muted" style={{ margin: 0 }}>
            {t('Changes apply to this date only. The days a week opens are set with “Plan this week”.')}
          </p>
          <label className="dialog-check">
            <input
              type="checkbox"
              name="closed"
              defaultChecked={editingDay.closed}
              onChange={(e) => setEditingDay({ ...editingDay, closed: e.target.checked })}
            />
            {t('Closed that day')}
          </label>
          {!editingDay.closed && (
            <>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="day-start">{t('Starts')}</label>
                  <input id="day-start" name="start" type="time" className="input" defaultValue={editingDay.start} required />
                </div>
                <div className="field">
                  <label htmlFor="day-end">{t('Ends')}</label>
                  <input id="day-end" name="end" type="time" className="input" defaultValue={editingDay.end} required />
                </div>
              </div>
              <div className="field">
                <label htmlFor="day-needed">{t('People needed')}</label>
                <input
                  id="day-needed"
                  name="needed"
                  type="number"
                  min="1"
                  max="20"
                  className="input"
                  defaultValue={editingDay.needed}
                  required
                />
              </div>
            </>
          )}
          {formError && <div role="alert" style={{ color: 'var(--color-danger)', fontSize: 13 }}>{formError}</div>}
          {editingDay.day.exception && (
            <button
              type="button"
              className="btn btn-ghost self-start"
              onClick={() => {
                const { day } = editingDay;
                setEditingDay(null);
                actions.clearServiceDay(day.key);
              }}
            >
              {t('Back to the planned hours')}
            </button>
          )}
        </Dialog>
      )}

      {editingWeek && (
        <Dialog
          title={t('Usual hours')}
          submitLabel="Save"
          wide
          onClose={() => setEditingWeek(false)}
          onSubmit={async (d) => {
            const { rows, error } = readWeek(d, t);
            if (error) {
              setFormError(error);
              return;
            }
            setEditingWeek(false);
            await actions.setOpeningHours(rows);
          }}
        >
          <p className="text-muted" style={{ margin: 0 }}>
            {t('One shift a day at most. These are the hours of every week that has no plan of its own: plan a week from the calendar to open other days.')}
          </p>
          <WeekRows rows={weekly} t={t} />
          {formError && <div role="alert" style={{ color: 'var(--color-danger)', fontSize: 13 }}>{formError}</div>}
        </Dialog>
      )}

      {planning && (
        <Dialog
          key={planning.key}
          title={t('Week of {date}', { date: shortDate(planning.start, lang, true) })}
          submitLabel="Save"
          wide
          onClose={() => setPlanning(null)}
          onSubmit={async (d) => {
            const { rows, error } = readWeek(d, t);
            if (error) {
              setFormError(error);
              return;
            }
            if (!confirmLoss(placedLost(planning, rows))) return;
            const { key } = planning;
            setPlanning(null);
            await actions.setServiceWeek(key, rows);
          }}
        >
          <p className="text-muted" style={{ margin: 0 }}>
            {t('Choose the days the café opens this week, and their hours. The other weeks are not affected.')}
          </p>
          {/* a day this week doesn't open starts from the usual hours of that weekday, else from the first open day */}
          <WeekRows
            rows={planning.plan ?? weekly}
            fallbackFor={(weekday) => usualOf(weekday) ?? (planning.plan ?? weekly)[0]}
            t={t}
          />
          {formError && <div role="alert" style={{ color: 'var(--color-danger)', fontSize: 13 }}>{formError}</div>}
          {planning.plan && (
            <button
              type="button"
              className="btn btn-ghost self-start"
              onClick={async () => {
                if (!confirmLoss(placedLost(planning, null))) return;
                const { key } = planning;
                setPlanning(null);
                await actions.clearServiceWeek(key);
              }}
            >
              {t('Follow the usual hours again')}
            </button>
          )}
        </Dialog>
      )}
    </div>
  );
}

const addDays = ({ y, m, d }, n) => {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
};
const weekdayOf = ({ y, m, d }) => new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7; // 1 = Monday

// The day at a date: the loaded one, or a day without a service (an admin can open it).
function dayAt(days, key) {
  const found = days.find((d) => d.key === key);
  if (found) return found;
  const date = parseDateKey(key);
  const today = todayKey();
  return { key, date, weekday: weekdayOf(date), isToday: key === today, past: key < today, closed: false, exception: false, service: null };
}

const firstName = (name) => (name ?? '—').split(' ')[0];

const ChevronIcon = ({ dir }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
  </svg>
);

// Two weeks, Monday to Sunday, with arrows to the two weeks before or after, without limit.
// Each week has a bar saying whether it follows the usual hours or has a plan of its own, and
// admins plan it from there. Past days are greyed out and read-only.
function Calendar({ days, range, weeks, hasUsual, onPlan, page, loading, onPage, me, isAdmin, nameOf, onOpen }) {
  const { t, lang } = useT();
  const today = todayKey();
  const byKey = new Map(days.map((d) => [d.key, d]));
  const cells = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(range.from, i);
    const key = dateKey(date);
    return { key, date, past: key < today, day: byKey.get(key) };
  });
  const weekdayName = (date, style) =>
    new Date(Date.UTC(date.y, date.m - 1, date.d)).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
      weekday: style,
      timeZone: 'UTC',
    });
  const monthName = (date) =>
    new Date(Date.UTC(date.y, date.m - 1, date.d)).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
      month: 'short',
      timeZone: 'UTC',
    });

  const renderCell = (c, i) => {
    const day = c.day;
    const s = day?.service;
    const open = s ? s.needed - s.assigned.length : 0;
    const mine = s?.assigned.includes(me.id);
    // Members open a day with a service; admins also open closed days and empty ones.
    const clickable = c.past ? Boolean(s) : Boolean(s || isAdmin);
    const showMonth = i === 0 || c.date.d === 1;
    const state = `${day?.closed ? 'is-closed' : s ? (open > 0 ? 'is-open' : 'is-full') : 'is-empty'}${c.past ? ' is-past' : ''}`;
    const label = [
      formatDay(c.date, lang),
      day?.closed ? t('Closed') : s ? `${s.time}, ${t('{a} of {b} staffed', { a: s.assigned.length, b: s.needed })}` : t('No service'),
      mine ? t('You are on it') : '',
    ]
      .filter(Boolean)
      .join(' · ');
    const body = (
      <>
        <span className="cal-date">
          <span className={c.key === today ? 'cal-num cal-today' : 'cal-num'}>{c.date.d}</span>
          {showMonth && <span className="cal-month">{monthName(c.date)}</span>}
          {mine && <span className="tag tag-accent-2 cal-me">{t('Me')}</span>}
        </span>
        {day?.closed && <span className="cal-note">{t('Closed')}</span>}
        {s && (
          <>
            <span className="cal-time">{s.time}</span>
            <span className={open > 0 ? 'tag tag-warn cal-count' : 'tag tag-accent-2 cal-count'}>
              {s.assigned.length}/{s.needed}
            </span>
            {s.assigned.length > 0 && (
              <span className="cal-names">
                {s.assigned.slice(0, 3).map((id) => firstName(nameOf.get(id))).join(', ')}
                {s.assigned.length > 3 && ` +${s.assigned.length - 3}`}
              </span>
            )}
          </>
        )}
        {day?.exception && !day.closed && <span className="cal-flag" title={t('Special hours')} />}
      </>
    );
    return clickable ? (
      <button key={c.key} type="button" role="listitem" className={`cal-cell ${state}`} aria-label={label} onClick={() => onOpen(c.key)}>
        {body}
      </button>
    ) : (
      <div key={c.key} role="listitem" className={`cal-cell ${state}`} aria-label={label}>
        {body}
      </div>
    );
  };

  return (
    <div className="card elev-sm cal">
      <div className="cal-nav">
        <button type="button" className="btn btn-secondary btn-icon" aria-label={t('Previous two weeks')} onClick={() => onPage(page - 1)}>
          <ChevronIcon dir="left" />
        </button>
        <div className="cal-range" aria-live="polite">
          {shortDate(range.from, lang, range.from.y !== range.to.y)} – {shortDate(range.to, lang, true)}
        </div>
        <button type="button" className="btn btn-secondary btn-icon" aria-label={t('Next two weeks')} onClick={() => onPage(page + 1)}>
          <ChevronIcon dir="right" />
        </button>
        {page !== 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => onPage(0)}>
            {t('Today')}
          </button>
        )}
      </div>
      <div className={loading ? 'cal-weeks is-loading' : 'cal-weeks'} aria-busy={loading}>
        {weeks.map((w, n) => (
          <div key={w.key} className="cal-week">
            <div className="cal-week-bar">
              <span className="cal-week-title">{t('Week of {date}', { date: shortDate(w.start, lang) })}</span>
              <span className={w.plan ? 'tag tag-accent' : 'tag tag-neutral'}>
                {w.plan ? t('Custom week') : hasUsual ? t('Usual hours') : t('Not planned yet')}
              </span>
              {isAdmin && w.end >= today && (
                <button type="button" className="btn btn-secondary" onClick={() => onPlan(w)}>
                  {t('Plan this week')}
                </button>
              )}
            </div>
            <div className="cal-grid" role="list">
              {cells.slice(n * 7, n * 7 + 7).map((c) => (
                <div key={`head-${c.key}`} className="cal-head" aria-hidden="true">
                  {weekdayName(c.date, 'short')}
                </div>
              ))}
              {cells.slice(n * 7, n * 7 + 7).map((c, j) => renderCell(c, n * 7 + j))}
            </div>
          </div>
        ))}
      </div>
      <div className="cal-legend">
        <span><span className="tag tag-warn">1/2</span> {t('People missing')}</span>
        <span><span className="tag tag-accent-2">2/2</span> {t('Full')}</span>
        <span><span className="cal-flag cal-flag-static" /> {t('Special hours')}</span>
      </div>
    </div>
  );
}

// Everything about one day, opened from the calendar.
function DayDialog({ day, me, isAdmin, nameOf, onClose, onAssign, onEdit, onReopen, onToggle }) {
  const { t, lang } = useT();
  const s = day.service;
  const open = s ? s.needed - s.assigned.length : 0;
  const mine = s?.assigned.includes(me.id);
  return (
    <Dialog title={formatDay(day.date, lang)} onClose={onClose}>
      {day.closed ? (
        <>
          <Michel pose="chill" className="michel-state" />
          <p style={{ margin: 0, textAlign: 'center' }}>{t('Closed that day.')}</p>
          {isAdmin && (
            <div className="shift-actions">
              <button className="btn btn-secondary" onClick={() => onReopen(day)}>{t('Reopen as planned')}</button>
              <button className="btn btn-ghost" onClick={() => onEdit(day)}>{t('Edit this day')}</button>
            </div>
          )}
        </>
      ) : !s ? (
        <>
          <Michel pose="chill" className="michel-state" />
          <p style={{ margin: 0, textAlign: 'center' }}>{t('No service planned that day.')}</p>
          {isAdmin && (
            <div className="shift-actions">
              <button className="btn btn-secondary" onClick={() => onEdit(day)}>{t('Open this day')}</button>
            </div>
          )}
        </>
      ) : (
        <>
          {day.past && <p className="text-muted" style={{ margin: 0 }}>{t('This day is over.')}</p>}
          <div className="shift">
            <div className="shift-head">
              <div className="shift-time">{s.time}</div>
              <span className={open > 0 ? 'tag tag-warn' : 'tag tag-accent-2'}>
                {open > 0 ? t('{n} open', { n: open }) : t('Full')}
              </span>
            </div>
            {day.exception && <span className="tag tag-neutral self-start">{t('Special hours')}</span>}
            <div className="shift-staffed">{t('{a} of {b} staffed', { a: s.assigned.length, b: s.needed })}</div>
            {s.assigned.length > 0 && (
              <div className="shift-people">
                {s.assigned.map((id) => (
                  <span key={id} className="shift-person">
                    {nameOf.get(id) ?? '—'}
                    {s.busy.includes(id) && (
                      <span className="tag tag-warn" title={t('Their calendar shows an event at this time')}>
                        {t('Busy')}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
            {!day.past && <div className="shift-actions">
              {isAdmin ? (
                <>
                  <button className="btn btn-secondary" onClick={() => onAssign(day)}>{t('Assign staff')}</button>
                  <button className="btn btn-ghost" onClick={() => onEdit(day)}>{t('Edit this day')}</button>
                </>
              ) : (
                <button className="btn btn-primary" disabled={open <= 0 && !mine} onClick={() => onToggle(day, mine)}>
                  {mine ? t('Leave shift') : t('Take shift')}
                </button>
              )}
            </div>}
          </div>
          {!day.past && !day.hints && (
            <p className="hint" style={{ margin: 0 }}>
              {t('Who is free is only worked out for the next two weeks, from connected calendars.')}
            </p>
          )}
          {day.hints && <div className="free-row">
            <div className="label-caps">{t('Free')}</div>
            {!day.hasCalendars ? (
              <span className="text-muted" style={{ fontSize: 13 }}>{t('No calendars connected yet')}</span>
            ) : day.free.length === 0 ? (
              <span className="text-muted" style={{ fontSize: 13 }}>{t('Nobody is free')}</span>
            ) : (
              day.free.map((person) => <span key={person} className="tag tag-accent-2 tag-lg">{person}</span>)
            )}
          </div>}
          {day.hints && day.hasCalendars && (
            <div className="hint">
              {day.noClass.length > 0 && <span>{t('No classes that day: {names}.', { names: day.noClass.join(', ') })} </span>}
              <span>{t('Availability is only a hint: it never decides who works a shift.')}</span>
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}

// The seven weekdays of a week form (the usual hours, or one week's plan). `rows` are the
// days open when the form opens; `fallbackFor(weekday)` gives the hours a closed weekday
// starts from if it gets opened.
function WeekRows({ rows, fallbackFor, t }) {
  return (
    <div className="week-hours">
      {WEEKDAYS.map((name, i) => (
        <WeekdayRow
          key={name}
          weekday={i + 1}
          name={t(name)}
          current={rows.find((r) => r.weekday === i + 1)}
          fallback={fallbackFor?.(i + 1)}
          t={t}
        />
      ))}
    </div>
  );
}

// One line of a week form: open that weekday?, hours, head count.
function WeekdayRow({ weekday, name, current, fallback, t }) {
  const [open, setOpen] = useState(Boolean(current));
  const shown = current ?? fallback;
  const [start, end] = splitTime(shown?.time_label);
  return (
    <div className="week-row">
      <label className="week-day">
        <input type="checkbox" name={`open-${weekday}`} checked={open} onChange={(e) => setOpen(e.target.checked)} />
        {name}
      </label>
      {open ? (
        <>
          <input aria-label={`${name} · ${t('Starts')}`} name={`start-${weekday}`} type="time" className="input" defaultValue={start} required />
          <input aria-label={`${name} · ${t('Ends')}`} name={`end-${weekday}`} type="time" className="input" defaultValue={end} required />
          <input
            aria-label={`${name} · ${t('People needed')}`}
            name={`needed-${weekday}`}
            type="number"
            min="1"
            max="20"
            className="input"
            defaultValue={shown?.needed ?? 2}
            required
          />
        </>
      ) : (
        <span className="text-muted week-closed">{t('Closed')}</span>
      )}
    </div>
  );
}
