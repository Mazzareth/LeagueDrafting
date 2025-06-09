import { NextRequest, NextResponse } from 'next/server'
import { get, set, getAll } from '@vercel/edge-config'

export async function GET(request: NextRequest) {
  try {
    // Try to get a test value
    const greeting = await get('greeting')
    
    // If it doesn't exist, set a default value
    if (greeting === undefined) {
      await set('greeting', 'Hello from Edge Config!')
      
      // Also set up a test draft config
      await set('draft_config', {
        ttlHours: 24,
        maxDraftsPerUser: 5,
        version: '1.0.0'
      })
      
      return NextResponse.json({ 
        message: 'Edge Config initialized with default values',
        greeting: 'Hello from Edge Config!',
        config: {
          ttlHours: 24,
          maxDraftsPerUser: 5,
          version: '1.0.0'
        }
      })
    }
    
    // Get the draft config
    const draftConfig = await get('draft_config')
    
    // Return all values
    return NextResponse.json({ 
      message: 'Edge Config is working!',
      greeting,
      draftConfig
    })
  } catch (error) {
    console.error('Error accessing Edge Config:', error)
    return NextResponse.json({ 
      error: 'Failed to access Edge Config',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (!body.key || !body.value) {
      return NextResponse.json({ error: 'Missing key or value in request body' }, { status: 400 })
    }
    
    // Set the value in Edge Config
    await set(body.key, body.value)
    
    return NextResponse.json({ 
      message: `Successfully set ${body.key} in Edge Config`,
      key: body.key,
      value: body.value
    })
  } catch (error) {
    console.error('Error setting value in Edge Config:', error)
    return NextResponse.json({ 
      error: 'Failed to set value in Edge Config',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}