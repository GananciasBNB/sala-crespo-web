// On-screen keyboard of the kiosk: replaces the Windows touch keyboard (inputs use
// inputMode="none" so Windows doesn't pop its own). Big keys for older members.
// mode: 'name' (letters, auto-capital at word start), 'email' (lowercase + shortcuts), 'num'
const ROWS_LETTERS = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM']
const EMAIL_SHORTCUTS = ['@gmail.com', '@hotmail.com', '@yahoo.com.ar', '.com']

export default function KioskKeyboard({ mode, label, value, placeholder, secret, onKey, onBack, onNext, nextLabel = 'SIGUIENTE', onClose }) {
  // pointerdown (not click): no focus loss on the input, instant response on touch
  const press = (fn) => (e) => { e.preventDefault(); fn() }
  // big display of the field being typed: the form itself may sit behind the keyboard
  const visor = (
    <div className="kkb__visor" aria-live="polite">
      <div className="kkb__visor-label">{label}</div>
      <div className={`kkb__visor-value${value ? '' : ' kkb__visor-value--empty'}`}>
        {value ? (secret ? '•'.repeat(value.length) : value) : placeholder}<span className="kkb__caret" />
      </div>
    </div>
  )

  if (mode === 'num') {
    return (
      <div className="kkb kkb--num" role="group" aria-label="Teclado numérico">
        {visor}
        <div className="kkb__numgrid">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => (
            <button key={k} type="button" className="kkb__key kkb__key--num" onPointerDown={press(() => onKey(k))}>{k}</button>
          ))}
          <button type="button" className="kkb__key kkb__key--num kkb__key--fn" onPointerDown={press(onBack)} aria-label="Borrar">⌫</button>
          <button type="button" className="kkb__key kkb__key--num" onPointerDown={press(() => onKey('0'))}>0</button>
          <button type="button" className="kkb__key kkb__key--num kkb__key--ok" onPointerDown={press(onNext)}>{nextLabel}</button>
        </div>
        <button type="button" className="kkb__close" onPointerDown={press(onClose)}>Ocultar teclado ▾</button>
      </div>
    )
  }

  const email = mode === 'email'
  return (
    <div className="kkb" role="group" aria-label="Teclado">
      {visor}
      {email && (
        <div className="kkb__row kkb__row--short">
          {EMAIL_SHORTCUTS.map(s => (
            <button key={s} type="button" className="kkb__key kkb__key--short" onPointerDown={press(() => onKey(s))}>{s}</button>
          ))}
        </div>
      )}
      {email && (
        <div className="kkb__row">
          {'1234567890'.split('').map(k => (
            <button key={k} type="button" className="kkb__key" onPointerDown={press(() => onKey(k))}>{k}</button>
          ))}
        </div>
      )}
      {ROWS_LETTERS.map((row, i) => (
        <div key={row} className="kkb__row">
          {row.split('').map(k => (
            <button key={k} type="button" className="kkb__key" onPointerDown={press(() => onKey(email ? k.toLowerCase() : k))}>
              {email ? k.toLowerCase() : k}
            </button>
          ))}
          {i === 2 && <button type="button" className="kkb__key kkb__key--fn kkb__key--wide" onPointerDown={press(onBack)} aria-label="Borrar">⌫ Borrar</button>}
        </div>
      ))}
      <div className="kkb__row">
        {email
          ? ['@', '.', '_', '-'].map(k => <button key={k} type="button" className="kkb__key kkb__key--fn" onPointerDown={press(() => onKey(k))}>{k}</button>)
          : null}
        {!email && <button type="button" className="kkb__key kkb__key--space" onPointerDown={press(() => onKey(' '))}>espacio</button>}
        <button type="button" className="kkb__key kkb__key--ok" onPointerDown={press(onNext)}>{nextLabel}</button>
      </div>
      <button type="button" className="kkb__close" onPointerDown={press(onClose)}>Ocultar teclado ▾</button>
    </div>
  )
}
