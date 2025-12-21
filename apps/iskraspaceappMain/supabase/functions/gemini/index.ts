/**
 * Supabase Edge Function: Gemini API Proxy
 *
 * This function proxies requests to Google's Gemini API,
 * keeping the API key secure on the server side.
 *
 * Deploy with: supabase functions deploy gemini
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const { action, ...params } = await req.json();

    let endpoint: string;
    let body: any;

    switch (action) {
      case 'generateContent':
        endpoint = `/models/${params.model || 'gemini-2.0-flash'}:generateContent`;
        body = {
          contents: params.contents,
          systemInstruction: params.systemInstruction,
          generationConfig: params.generationConfig,
        };
        break;

      case 'streamGenerateContent':
        endpoint = `/models/${params.model || 'gemini-2.0-flash'}:streamGenerateContent`;
        body = {
          contents: params.contents,
          systemInstruction: params.systemInstruction,
          generationConfig: params.generationConfig,
        };
        break;

      case 'embedContent':
        endpoint = `/models/${params.model || 'text-embedding-004'}:embedContent`;
        body = {
          content: params.content,
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const url = `${GEMINI_BASE_URL}${endpoint}?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    // For streaming, we need to handle differently
    if (action === 'streamGenerateContent') {
      // Return the stream directly
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
        },
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Edge function error:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
