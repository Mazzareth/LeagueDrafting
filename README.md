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
- Persistent draft state using Vercel KV

## Deployment

Your project is live at:

**[https://vercel.com/mazzareth/v0-new-project-ckv8mbczwkf](https://vercel.com/mazzareth/v0-new-project-ckv8mbczwkf)**

## Setup

1. Clone this repository
2. Install dependencies with `pnpm install`
3. Set up Vercel KV:
   - Create a Vercel KV database in your Vercel project
   - Add the KV environment variables to your project
   - Copy `.env.example` to `.env.local` and fill in the KV credentials
4. Run the development server with `pnpm dev`

## Environment Variables

The following environment variables are required for Vercel KV:

```
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=
```

You can get these values from your Vercel project dashboard under the Storage tab.

## How It Works

1. Users create a draft room which generates a unique 6-character code
2. The creator becomes the Blue Team
3. Another user can join using the code and becomes the Red Team
4. Both players go through the pick/ban phase following competitive rules
5. Draft state is persisted using Vercel KV for reliability
