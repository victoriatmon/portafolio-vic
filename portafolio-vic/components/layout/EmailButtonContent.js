import { CopyIcon, CheckIcon } from './copyEmailIcons';

// The label+icon pair inside an Email copy-to-clipboard button (desktop
// footer and mobile menu sheet both use this). Keyed by `copied` so React
// remounts it on each state flip instead of mutating the existing nodes in
// place -- combined with the `*-content` CSS animation (fade + slight rise)
// in footer.css/navbar.css, the label and icon ease in together rather than
// popping instantly, which is what made the swap feel abrupt/"forced"
// especially at the mobile menu's larger 32px type size.
export default function EmailButtonContent({ copied, leaving, size, contentClassName, iconClassName }) {
  return (
    <span
      key={copied ? 'copied' : 'idle'}
      className={contentClassName + (leaving ? ' is-leaving' : '')}
    >
      <span>{copied ? 'Email copied!' : 'Email'}</span>
      <span className={iconClassName}>
        {copied ? <CheckIcon size={size} /> : <CopyIcon size={size} />}
      </span>
    </span>
  );
}
