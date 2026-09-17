# Fazal Hameed — Interactive 3D Portfolio

An experimental developer portfolio that turns navigation into an interactive 3D experience.

Rather than building a conventional portfolio made only of static sections, cards, and page transitions, I wanted the portfolio itself to reflect my work and interests in **Artificial Intelligence, Machine Learning, and software development**.

The result is a cinematic portfolio built around an interactive humanoid robot that physically responds to user interactions.

🌐 **Live Portfolio:**  
https://fazal-hameed-ortfolio.vercel.app/

---

## The Idea

An AI/ML portfolio shouldn't only tell visitors:

> "I work with Artificial Intelligence."

It should make them **experience technology while exploring it.**

The portfolio therefore combines a traditional professional portfolio with an interactive 3D environment.

Instead of simply clicking a navigation element and immediately loading another page, the website can involve the robot in the interaction:

**User Interaction → Robot Movement → Physical Contact → Transition → Destination**

The robot is not intended to be a decorative 3D model sitting in the middle of the screen. It is integrated into the navigation and transition system.

---

## Interactive Robot Navigation

One of the main experiments in this project is connecting ordinary DOM interactions with a 3D character.

When a robot-enabled navigation element is selected:

1. The exact pointer position is captured.
2. The screen coordinate is converted into the Three.js world.
3. The robot moves toward the interaction point.
4. Its real animated **index fingertip** is used as the interaction anchor.
5. The robot's root position is dynamically corrected so the fingertip reaches the target.
6. Contact is measured before the UI action is executed.
7. The transition sequence begins.
8. The requested page or interface state is revealed.

This creates the illusion that the robot is physically interacting with the website rather than simply playing an animation near a button.

---

## Cinematic Navigation

Navigation is treated as a visual sequence rather than an instantaneous route change.

The portfolio experiments with:

- 3D character movement
- exact fingertip-to-interface targeting
- robot-assisted navigation
- flight animations
- procedural fire effects
- particle systems
- sparks and embers
- smoke trails
- shockwaves
- impact effects
- screen transitions
- cinematic page reveals
- animated opening sequences
- route choreography

The goal is to make moving through the portfolio feel closer to interacting with a digital environment than browsing a conventional website.

---

## Flight & Fire FX

During high-speed robot movement, the portfolio uses a custom flight-effects system rather than simple circular particle effects.

The system includes:

- layered thruster flames
- tapered flame geometry
- velocity-based flame direction
- world-space fire trails
- sparks
- embers
- smoke residue
- shockwave effects
- dynamic light
- movement banking/rotation
- pooled particle systems

Effects are synchronized with the robot's movement and cleared appropriately when contact or landing occurs.

---

## Exact Fingertip Targeting

A particularly interesting technical challenge was determining **what part of the robot should reach the clicked element**.

Moving the robot's root position to a button is not enough.

That can result in the robot's:

- head reaching the button,
- feet reaching the button,
- or entire body simply appearing near it.

Instead, this project uses the animated skeleton's right index fingertip as the target anchor.

The interaction system effectively solves:

```text
requiredRobotPosition =
clickedWorldPosition - fingertipOffsetFromRobot
```

The live fingertip position can then be checked against the original screen-space target before contact is confirmed.

This allows navigation to wait for the robot's physical interaction rather than relying entirely on arbitrary timers.

---

## Opening Experience

The portfolio also includes a custom introductory experience.

The idea is to introduce the visitor to the interactive nature of the website before normal exploration begins.

The sequence involves the robot approaching the interface, interacting with the entry control, welcoming the visitor, and transitioning into the main Hero experience.

This establishes the robot as part of the portfolio's interface rather than a background decoration.

---

## Portfolio Sections

The portfolio currently includes dedicated sections for:

- Hero
- About
- Projects
- Skills & Technologies
- Education
- Certifications
- Workshops
- Experience
- GitHub
- Journey
- Contact

These sections present my work across software development, Artificial Intelligence, Machine Learning, Generative AI, Agentic AI, RAG systems, computer vision, and related technologies.

---

## Featured Work

Projects represented in the portfolio include work such as:

### LexBot

An AI-powered legal assistant built around Retrieval-Augmented Generation (RAG), document processing, semantic retrieval, and conversational AI.

### ZYRA

**Zero Tolerance Yield for Rogue Actions** — a computer-vision project exploring YOLO-based detection for suspicious activity and examination monitoring.

Additional software, AI, RAG, web, and machine-learning projects are available through the portfolio and my GitHub profile.

---

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- HTML
- CSS

### 3D & WebGL

- Three.js
- React Three Fiber
- Drei
- WebGL
- GLB / glTF models

### Animation

- GSAP
- Three.js animation system
- skeletal animation
- procedural movement
- custom transition choreography

### 3D Character Animation

- Mixamo animation clips
- skeletal/bone targeting
- Three.js `AnimationMixer`
- runtime bone tracking

### Visual Effects

- custom geometry
- shader-based effects
- `BufferGeometry`
- instanced particles
- world-space trails
- procedural fire
- sparks / embers
- smoke
- dynamic lighting

### Deployment

- Vercel

---

## Architecture

A simplified version of the interaction architecture looks like this:

```text
User clicks interactive element
            │
            ▼
   Capture screen position
            │
            ▼
     Navigation event
            │
            ▼
      Robot Director
            │
            ▼
Screen coordinate → Three.js world coordinate
            │
            ▼
     Robot movement
            │
            ▼
Live fingertip position tracking
            │
            ▼
   Contact threshold reached
            │
            ▼
      Contact confirmed
            │
            ▼
   Cinematic transition
            │
            ▼
      Route / UI action
```

The important principle is that navigation and robot animation are connected instead of operating as two unrelated systems.

---

## Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/HameeedCodes932/My-Portfolio.git
```

### 2. Enter the project

```bash
cd My-Portfolio
```

### 3. Install dependencies

Using npm:

```bash
npm install
```

### 4. Start the development server

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

## Production Build

Create a production build with:

```bash
npm run build
```

Run the production server with:

```bash
npm start
```

---

## Using This Portfolio as a Starting Point

If you like the concept, you can clone or fork the repository and adapt it for your own portfolio.

### Fork the repository

Use GitHub's **Fork** option, or clone it directly:

```bash
git clone https://github.com/HameeedCodes932/My-Portfolio.git
```

Then install the dependencies:

```bash
cd My-Portfolio
npm install
npm run dev
```

From there, replace my personal information, projects, education, certifications, social links, images, and other portfolio content with your own.

You can also replace the 3D model and adapt the robot interaction system to your own character or visual concept.

---

## Important Note for Reuse

You are welcome to study, fork, modify, and build on this project according to the repository's license.

If you create your own portfolio from it, I strongly recommend making the experience your own rather than simply replacing the name and deploying an identical copy.

Change the:

- visual identity
- content
- 3D character
- animations
- interaction concept
- colors
- transitions
- effects

The interesting part of creative development is experimentation.

---

## Project Structure

A simplified overview:

```text
My-Portfolio/
│
├── app/
│   ├── about/
│   ├── projects/
│   ├── skills/
│   ├── education/
│   ├── certifications/
│   ├── workshops/
│   ├── experience/
│   ├── github/
│   ├── journey/
│   └── contact/
│
├── components/
│   ├── scene/
│   │   ├── Scene
│   │   ├── Robot
│   │   ├── RobotDirector
│   │   └── RobotFlightFX
│   │
│   ├── transition/
│   ├── sections/
│   └── ui/
│
├── lib/
│   ├── content
│   ├── sections
│   └── navigation events
│
└── public/
    ├── models/
    └── assets/
```

The exact structure may evolve as the project continues.

---

## Performance

Because the portfolio combines a conventional React application with a persistent Three.js scene, performance is an important part of the implementation.

The project uses techniques such as:

- reusable geometry/materials
- pooled effects
- instanced particles
- controlled animation loops
- responsive effect counts
- mobile-specific reductions
- reduced-motion behavior
- optimized GLB assets

The aim is to preserve the cinematic experience without treating the browser like an unlimited GPU environment.

---

## Status

This portfolio is an evolving personal project.

I continue experimenting with:

- WebGL
- Three.js
- interactive 3D interfaces
- procedural visual effects
- AI-inspired visualizations
- cinematic web transitions
- human-computer interaction

So expect the experience and implementation to continue changing.

---

## Author

**Fazal Hameed**

Software Developer focused on AI-driven products and intelligent systems.

GitHub:  
https://github.com/HameeedCodes932

Portfolio:  
https://fazal-hameed-ortfolio.vercel.app/

---

## Feedback & Contributions

Ideas, feedback, issues, and improvements are welcome.

If you find something interesting in the project, feel free to explore the code, open an issue, or experiment with your own implementation.

If you build something inspired by it, I'd love to see what you create.

---

> **Don't just tell people what you build. Let them experience it.**
