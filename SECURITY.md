# Security Policy

Saundarya Studio runs entirely in the browser and does not collect, transmit or
store any user data. There is no server component to secure.

## Reporting a vulnerability

If you believe you've found a security issue — for example something that could
let a crafted image or URL execute code, or that leaks or uploads local media —
please report it privately rather than in a public issue.

Open a private security advisory through
[GitHub's "Report a vulnerability"](https://github.com/aaravshirpurkar/SaundaryaStudio/security/advisories/new)
form, or email the maintainer at the address on their GitHub profile.

We aim to acknowledge private reports within a few days and will coordinate
disclosure before publishing a fix.

## Scope

In scope:

- WebGL2 / GLSL shader safety
- Web Worker message handling
- Preset URL serialisation (`hydrate`) and export-generated code
- Media loading from user-supplied URLs

Out of scope:

- Physical or social engineering
- Third-party assets (Unsplash imagery, remote sample videos) you choose to load
- Issues requiring you to run untrusted code against your own browser
