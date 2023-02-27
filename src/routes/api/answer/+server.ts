import { VITE_OPEN_AI_API_KEY } from "$env/static/private";
import { error } from "@sveltejs/kit";
import { oneLine, stripIndent } from "common-tags";
import type { CreateCompletionRequest } from "openai";

import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
    try {
        if (!VITE_OPEN_AI_API_KEY) {
            throw new Error('VITE_OPEN_AI_API_KEY is not set');
        }
        const requestData = await request.json();

        if (!requestData) {
            throw new Error('Request data is missing')
        }

        const { context } = requestData;

        if (!context) {
            throw new Error('No context provided')
        }

        const prompt = stripIndent`
        ${oneLine`
            For every question I give to you I want you to answer correctly no matter what but be very sarcastic and rude, using at least one curse word and one insult. Be very creative when cursing. The context is below.
        `}

        Context: """${context.trim()}"""

        Answer:
        `

        const completionOptions: CreateCompletionRequest = {
            model: 'text-davinci-003',
            prompt,
            max_tokens: 256,
            temperature: 0.9,
            stream: true
        }

        const response = await fetch('https://api.openai.com/v1/completions', {
            headers: {
                Authorization: `Bearer ${VITE_OPEN_AI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify(completionOptions)
        })

        if (!response.ok) {
            const err = await response.json();
            console.log(err);
            throw new Error('Failed to create completion', err);
        }

        return new Response(response.body, {
            headers: {
                'Content-Type': 'text/event-stream'
            }
        })

    } catch (err) {
        console.error(err);
        throw error(500, 'There was a problem');
    }
}