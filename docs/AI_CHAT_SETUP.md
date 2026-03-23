# AI Chat Setup Guide

## Quick Start

The AI chat system is now configured and ready to use. You just need to add your OpenAI API key.

## Step 1: Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy your API key

## Step 2: Add API Key to Environment

Open your `.env` file and replace `your-openai-api-key-here` with your actual API key:

```env
VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

## Step 3: Restart Dev Server

After adding the API key, restart your development server for the changes to take effect.

## What's Configured

The AI chat system is configured with:

- **Provider**: OpenAI
- **Model**: GPT-4o (for project context)
- **Fallback**: GPT-4o Mini (for personal/general chat)
- **Features**: Chat, reasoning, vision, tool use, long context support
- **Context Window**: 128,000 tokens
- **Max Output**: 16,384 tokens

## Troubleshooting

### "Provider undefined" or "Model undefined" Error

This means the API key is missing or invalid. Check:
1. The API key is correctly set in `.env`
2. The `.env` file has been saved
3. You've restarted the dev server after adding the key

### Rate Limit Errors

If you see rate limit errors:
1. Check your OpenAI account usage limits
2. Add payment method to your OpenAI account
3. The system will automatically fall back to Claude if available

## Cost Estimates

GPT-4o pricing:
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens

GPT-4o Mini pricing:
- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

Typical chat message: ~500 tokens (~$0.005 per message with GPT-4o)

## Database Configuration

The following has been automatically configured in your database:

- AI Providers (OpenAI, Anthropic)
- AI Models (GPT-4o, GPT-4o Mini, Claude)
- AI Routes (ai_chat feature routing)

You can view and manage these in the Admin panel under AI Providers and AI Routing.
