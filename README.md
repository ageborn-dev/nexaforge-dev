<div align="center">
  <img alt="NexaForge" src="./public/logo.svg" height="50">
  <h1>NexaForge</h1>
</div>

<p align="center">
  Transform your ideas into code using multiple AI models. Built on the foundation of GeminiCoder, enhanced with powerful new features.
</p>

<div align="center">
  <a href="https://nexaforge.example.com">Try it live</a>
  <p align="center">
    Soon live.
  </p>
</div>

## Overview

NexaForge is a powerful web application that allows you to generate functional applications from natural language descriptions. This project is a significant enhancement of [GeminiCoder](https://github.com/osanseviero/geminicoder), adding multiple AI model support and advanced features while maintaining the core simplicity.

## ✨ New Features

- **Multi-Model Support**: Integration with multiple AI providers:
  - Google Gemini (1.5 Pro, 1.5 Flash, 2.0 Flash)
  - Anthropic Claude
  - OpenAI GPT
  - DeepSeek

- **Enhanced Development Features**:
  - Real-time code generation with streaming support
  - Interactive chat interface for code refinement
  - Runtime error detection and automatic fixing
  - Token usage analytics and visualization
  - Save and load previous generations
  - Customizable AI settings per model

- **Advanced UI Components**:
  - Sandpack code editor integration
  - Token usage analytics window
  - AI settings configuration panel
  - Error fixing interface
  - Saved generations manager

## 🛠️ Tech Stack

- **Core**:
  - Next.js with App Router
  - Tailwind CSS for styling
  - Framer Motion for animations
  - Radix UI for accessible components

- **Code Integration**:
  - [Sandpack](https://sandpack.codesandbox.io/) for live code preview
  - Multiple AI Provider APIs:
    - Gemini API
    - Claude API
    - OpenAI API
    - DeepSeek API

## 🚀 Getting Started

1. Clone the repository:
```bash
git clone https://github.com/nexaforge-dev/nexaforge
```

2. Create a `.env` file and add your API keys:
```env
GOOGLE_AI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
```

3. Install dependencies and run:
```bash
npm install
npm run dev
```

## 🔧 Configuration

The application supports customizable settings for each AI model:
- Temperature
- Max tokens
- Top P
- Stream output
- Frequency penalty
- Presence penalty

## 🎯 Features in Detail

### Code Generation
- Real-time code streaming
- Syntax highlighting
- Live preview
- Error detection and fixing

### Chat Interface
- Interactive code refinement
- Context-aware suggestions
- Code modification history

### Analytics
- Token usage tracking
- Model performance metrics
- Cost estimation

### Project Management
- Save generations
- Load previous projects
- Export functionality

## 🙏 Acknowledgments

This project is based on [GeminiCoder](https://github.com/osanseviero/geminicoder) by [osanseviero](https://github.com/osanseviero), which in turn was inspired by [llamacoder](https://github.com/Nutlope/llamacoder). We've built upon their excellent foundation to create an enhanced multi-model experience.

## 📝 License

This project is open-source and available under the MIT License.

---

**Note**: This is a community project and is not officially affiliated with any of the AI model providers.
