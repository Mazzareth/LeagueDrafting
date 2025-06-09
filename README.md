# League Drafting Tool

*A tool for League of Legends players to practice and simulate the drafting phase*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/mazzareth/v0-new-project-ckv8mbczwkf)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/CkV8mBcZwkf)

## Overview

This application allows League of Legends players to practice the drafting phase by creating draft rooms and inviting others to join. The app simulates the pick/ban phase of competitive League of Legends.

## Features

- Create draft rooms as Blue Team
- Join existing drafts as Red Team using a 6-character code
- Real-time champion selection and banning
- Persistent draft state using a custom multi-layer storage system
- Drafts persist for 24 hours

## Deployment

Your project is live at:

**[https://vercel.com/mazzareth/v0-new-project-ckv8mbczwkf](https://vercel.com/mazzareth/v0-new-project-ckv8mbczwkf)**

## Setup

1. Clone this repository
2. Install dependencies with `pnpm install`
3. Run the development server with `pnpm dev`

## Persistence System

The application uses an environment-aware persistence system:

1. **Development Environment**: Uses in-memory storage for fast access during development
2. **Serverless Environment**: Uses a specialized in-memory store optimized for serverless functions
3. **Client-side localStorage**: For additional redundancy on the client

This approach ensures compatibility with serverless platforms like Vercel while maintaining draft persistence during the TTL period.

## How It Works

1. Users create a draft room which generates a unique 6-character code
2. The creator becomes the Blue Team
3. Another user can join using the code and becomes the Red Team
4. Both players go through the pick/ban phase following competitive rules
5. Draft state is persisted using our custom storage system
