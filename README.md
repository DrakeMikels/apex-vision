# ApexVision

**The first mobile visual-performance gym for FPS gamers.**

[**Live App →**](https://www.apex-vision.app)

---

## What It Is

ApexVision is a mobile-first PWA that uses your device camera to deliver structured visual warmup drills for competitive FPS players. The goal: improve target acquisition speed, reduce eye fatigue, and give players data-driven drill recommendations — all before a session.

## Features

- **Camera-based eye tracking** — uses device camera to detect and measure visual movement patterns
- - **Structured warmup drills** — guided exercises targeting tracking accuracy and reaction speed
  - - **Data-driven recommendations** — drill suggestions based on your performance patterns
    - - **Mobile PWA** — installable, no app store required, works on any modern smartphone
      - - **No video recorded or stored** — camera access is processed locally in-session only
       
        - ## Why It Exists
       
        - FPS players warm up their hands and wrists. Almost no one warms up their eyes. ApexVision applies the same warmup logic athletes use to a part of performance that's almost entirely ignored in competitive gaming.
       
        - ## Tech Stack
       
        - - **Framework:** Next.js (App Router)
          - - **Language:** TypeScript
            - - **Styling:** Tailwind CSS
              - - **Vision:** Browser MediaStream API (camera access, client-side only)
                - - **Deployment:** Vercel
                 
                  - ## Usage
                 
                  - Visit [apex-vision.app](https://www.apex-vision.app) on a mobile device, allow camera access, and run through the visual warmup sequence before your next session.
                 
                  - > No video is recorded or stored. Camera input is processed in-memory only during the session.
