import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@vercel/edge-config'

// Create Edge Config client with token if available
const edgeConfig = process.env.EDGE_CONFIG && process.env.EDGE_CONFIG_TOKEN
  ? createClient({
      connectionString: `${process.env.EDGE_CONFIG}_${process.env.EDGE_CONFIG_TOKEN}`
    })
  : null

export async function GET(request: NextRequest) {
  if (!edgeConfig) {
    return NextResponse.json({ 
      error: 'Edge Config client not initialized',
      details: 'Missing EDGE_CONFIG or EDGE_CONFIG_TOKEN environment variables'
    }, { status: 500 })
  }

  try {
    // Try to get a test value
    const greeting = await edgeConfig.get('greeting')
    
    // If it doesn't exist, set a default value
    if (greeting === undefined) {
      await edgeConfig.set('greeting', 'Hello from Edge Config!')
      
      // Also set up a test draft config
      await edgeConfig.set('draft_config', {
        ttlHours: 24,
        maxDraftsPerUser: 5,
        version: '1.0.0'
      })
      
      // Initialize empty drafts container
      await edgeConfig.set('drafts', {})
      
      // Initialize empty draft metadata container
      await edgeConfig.set('draft_meta', {})
      
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
    const draftConfig = await edgeConfig.get('draft_config')
    
    // Get all items for debugging
    const allItems = await edgeConfig.getAll()
    
    // Return all values
    return NextResponse.json({ 
      message: 'Edge Config is working!',
      greeting,
      draftConfig,
      allKeys: Object.keys(allItems)
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