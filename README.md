An interactive code animation of a pull-chain lamp that toggles power on/off and cycles through color-changing modes when you pull the strings.

Features

Pull-String Power Toggle: Pull the power cord to switch the lamp on or off with animated string stretch and snap-back motion.

Color-Changing Mode String: Pull the secondary mode cord to activate or cycle through color-changing lighting states and smooth hue transitions.

Interactive Controls: Supports mouse drag/click or touch pull on the cords (plus optional keyboard shortcuts if wired up).

Ambient Glow & Motion: Combines lamp illumination, soft light spread, and responsive cord physics.

How It Works
Power State (OFF / ON): Pulling the power string toggles the lamp state and animates the bulb/shade illumination.

Color Mode (Standard / Color Cycle): When powered on, pulling the color string switches between standard light and color-changing mode (or steps through color presets/hue shifts).

String Physics: Each pull extends the cord along its axis and eases or springs back into place on release.

Project Structure
Plaintext
pull-string-rgb-lamp/
├── index.html        # Main entry point and canvas/scene container
├── styles.css        # Scene layout, lighting/glow styles, and responsive styling
├── script.js         # Lamp state machine, string pull interaction, and color animation loop
└── README.md         # Project documentation
