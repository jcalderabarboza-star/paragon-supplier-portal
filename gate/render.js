// The gate screen(s), returned as self-contained HTML by the middleware for any
// unauthenticated request. Standalone by necessity: on a static SPA the app
// bundle IS the content, so a real server-side gate cannot ship the bundle to
// unauthenticated clients — the screen therefore cannot be the mounted React
// Login.tsx. Instead it reprises Login.tsx's brand language (teal "P" mark,
// PARAGON CORP / Supplier Portal / Portal Kolaborasi Pemasok) restyled to DP-1
// (light surface, navy text, teal accent) with honest "Prototype access" copy.
// The in-app persona / CurrentIdentity flow is untouched — identity selection
// still happens inside the app, after the gate.

// Design tokens mirrored from tailwind.config.js (this page can't use Tailwind).
const T = {
  page: '#FAFBFC',
  surface: '#FFFFFF',
  navy: '#0D1B2A',
  mid: '#354A5F',
  tertiary: '#6B7785',
  teal: '#0097A7',
  tealHover: '#007A8A',
  tealSoft: '#E6F4F7',
  border: '#E5E9EE',
  borderInput: '#D1D8E0',
  dangerText: '#BB0000',
  dangerSoft: '#FCE4E4',
};

const BASE_STYLE = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;background:${T.page};color:${T.navy};
    min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:2rem 1rem;
    -webkit-font-smoothing:antialiased}
  .card{background:${T.surface};width:100%;max-width:400px;border:1px solid ${T.border};border-radius:12px;
    padding:40px;box-shadow:0 4px 12px rgba(13,27,42,0.08)}
  .brand{text-align:center;margin-bottom:26px}
  .mark{width:48px;height:48px;border-radius:50%;background:${T.teal};display:flex;align-items:center;
    justify-content:center;margin:0 auto 12px}
  .mark span{color:#fff;font-weight:700;font-size:22px}
  .org{font-weight:700;font-size:16px;color:${T.navy};letter-spacing:.05em}
  .sub{color:${T.teal};font-size:13px;font-weight:600;margin-top:2px}
  .sub-id{color:${T.tertiary};font-size:12px;font-style:italic;margin-top:6px}
  .eyebrow{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${T.mid};
    text-align:center;margin:18px 0 4px}
  .note{font-size:12px;color:${T.tertiary};text-align:center;margin-bottom:22px;line-height:1.5}
  label{font-size:12px;font-weight:600;color:${T.mid};display:block;margin-bottom:5px}
  input{width:100%;padding:10px 12px;border:1px solid ${T.borderInput};border-radius:6px;font-size:14px;
    font-family:inherit;color:${T.navy};background:#fff;outline:none}
  input:focus{border-color:${T.teal};box-shadow:0 0 0 3px ${T.tealSoft}}
  .field{margin-bottom:14px}
  button.submit{width:100%;padding:11px;border:none;border-radius:6px;background:${T.teal};color:#fff;
    font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;letter-spacing:.02em;margin-top:6px}
  button.submit:hover{background:${T.tealHover}}
  .err{background:${T.dangerSoft};color:${T.dangerText};border:1px solid ${T.dangerText}33;border-radius:6px;
    padding:9px 12px;font-size:13px;margin-bottom:16px;text-align:center}
  .footer{margin-top:24px;font-size:11px;color:${T.mid};text-align:center;line-height:1.5}
`;

function shell(title, inner) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="robots" content="noindex, nofollow" />
<meta name="theme-color" content="#0D1B2A" />
<title>${title}</title>
<style>${BASE_STYLE}</style>
</head>
<body>
${inner}
</body>
</html>`;
}

const BRAND = `
  <div class="brand">
    <div class="mark"><span>P</span></div>
    <div class="org">PARAGON CORP</div>
    <div class="sub">Supplier Portal</div>
    <div class="sub-id">Portal Kolaborasi Pemasok</div>
  </div>`;

const FOOTER = `
  <div class="footer">
    Odyssey Digital Transformation Program · Prototype<br />
    &copy; 2026 PT Paragon Technology and Innovation
  </div>`;

// The access-request screen. `error` is a fixed, code-controlled string (never
// user input) so there is nothing to escape / no reflected-XSS surface.
export function renderGatePage({ error } = {}) {
  const inner = `
  <div class="card">
    ${BRAND}
    <div class="eyebrow">Prototype access</div>
    <div class="note">This is a pre-release prototype for authorized reviewers.<br />Please sign in to continue.</div>
    ${error ? `<div class="err">${error}</div>` : ''}
    <form method="POST" action="/__gate/login" autocomplete="off">
      <div class="field">
        <label for="username">Username</label>
        <input id="username" name="username" type="text" autofocus autocapitalize="off" spellcheck="false" />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" />
      </div>
      <button class="submit" type="submit">Enter</button>
    </form>
  </div>
  ${FOOTER}`;
  return shell('Prototype access · Paragon Supplier Portal', inner);
}

// Shown (503) when the gate secrets are not provisioned — the gate fails closed
// rather than silently exposing the prototype.
export function renderMisconfigPage() {
  const inner = `
  <div class="card">
    ${BRAND}
    <div class="eyebrow">Access gate</div>
    <div class="note">This prototype's access gate is not configured yet.<br />
      Set <strong>GATE_USER</strong>, <strong>GATE_PASSWORD</strong>, and <strong>GATE_SECRET</strong>
      in the project environment to enable sign-in.</div>
  </div>
  ${FOOTER}`;
  return shell('Access gate not configured · Paragon Supplier Portal', inner);
}
