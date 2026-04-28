import type { AppLocale } from "@/i18n/locales";

export interface AboutLink {
  label: string;
  href: string;
}

export interface AboutCardContent {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  links?: AboutLink[];
}

export interface AboutContent {
  intro: {
    eyebrow: string;
    title: string;
    description: string;
    highlights: string[];
  };
  cards: AboutCardContent[];
  support: {
    eyebrow: string;
    title: string;
    description: string;
    notes: string[];
  };
}

export const aboutContentByLocale: Record<AppLocale, AboutContent> = {
  "pt-BR": {
    intro: {
      eyebrow: "Sobre o Projeto",
      title:
        "Uma plataforma de calculadora de dano otimizada e veloz para Pokemon Champions.",
      description:
        "O Unburden foi projetado para agilizar o processo de teambuilding, permitindo que você simule cenarios de uma partida rapidamente por meio de cálculos rapidos e simples na forma de texto.",
      highlights: [
        "Gramática de prompt simples e intuitiva para matchups rápidos.",
        "Cálculo de dano comparando Min, Mid e Max bulk simultaneamente.",
        "Totalmente integrado às mecânicas de double battles e do Pokemon Champions.",
      ],
    },
    cards: [
      {
        eyebrow: "O Desenvolvedor",
        title: "Leandro Mesquita",
        description:
          "Desenvolvedor web/mobile e entusiasta do cenario competitivo de Pokemon/VGC.",
        bullets: [
          "Estudante de Ciência da Computação",
          "Preso no Master Ball 2000 pontos no Pokemon Champions",
          "Grande entusiasta de Tinkaton",
        ],
        links: [
          { label: "GitHub", href: "https://github.com/leandromesq" },
          { label: "Twitter/X", href: "https://x.com/lelezonio" },
          {
            label: "LinkedIn",
            href: "https://linkedin.com/in/leandro-mesquita-b41564306",
          },
        ],
      },
      {
        eyebrow: "O App",
        title: "Cálculos em Tempo Real",
        description:
          "O Unburden utiliza o motor de cálculos do Showdown para garantir precisão, enquanto a interface age como um editor de texto inteligente.",
        bullets: [
          "Fuzzy matching para Pokemon e golpes, reduzindo erros de digitação.",
          "Suporte para Mega Evoluções e estados de campo como Weather, Terrain etc.",
          "Compartilhamento via URL que preserva o estado completo do cálculo ou compartilhamento de texto dos resultados.",
        ],
      },
      {
        eyebrow: "Fluxo de Trabalho",
        title: "Editor Orientado por Prompt",
        description:
          "O Unburden foi projetado para reduzir atrito durante testes de matchup e criação de sets, mantendo o foco em velocidade e clareza.",
        bullets: [
          "Autocomplete e edição rápida para espécies, itens, abilities, golpes e spreads.",
          "Resumo lateral para ajustar set, stats, forma e contexto de batalha sem trocar de tela.",
          "Comparação imediata entre Min, Mid e Max bulk para acelerar decisões de teambuilding.",
          "Fluxo pensado para testes curtos, revisão de calcs e compartilhamento rápido por URL ou texto.",
        ],
      },
    ],
    support: {
      eyebrow: "Suporte e Comunidade",
      title: "Contribua com o Projeto",
      description:
        "O Unburden é um projeto em progresso. Se você encontrou bugs ou tem sugestões para a gramática de prompt, seu feedback é fundamental.",
      notes: [
        "Reporte problemas ou sugira features via GitHub Issues.",
        "Acompanhe o roadmap de atualizacoes do projeto.",
        "O Unburden continua proprietario e nao open source.",
      ],
    },
  },
  en: {
    intro: {
      eyebrow: "About the Project",
      title: "A damage-calculation workspace optimized for Pokemon Champions.",
      description:
        "Unburden is designed to speed up the teambuilding workflow. Instead of filling long forms, you use a fast prompt grammar to simulate VGC-style doubles scenarios in seconds.",
      highlights: [
        "High-speed prompt grammar for rapid matchup checks.",
        "Client-side damage calculation comparing Min, Mid, and Max bulk at the same time.",
        "Built around Champions SP spreads and battle mechanics.",
      ],
    },
    cards: [
      {
        eyebrow: "The Developer",
        title: "Leandro Mesquita",
        description:
          "Web/mobile developer and competitive Pokemon/VGC enthusiast.",
        bullets: [
          "Computer Science student",
          "Hardstuck 2000 points on Pokemon Champions",
          "Big Tinkaton enjoyer",
        ],
        links: [
          { label: "GitHub", href: "https://github.com/leandromesq" },
          { label: "Twitter/X", href: "https://x.com/lelezonio" },
          {
            label: "LinkedIn",
            href: "https://linkedin.com/in/leandro-mesquita-b41564306",
          },
        ],
      },
      {
        eyebrow: "The App",
        title: "Real-Time Calculations",
        description:
          "Unburden utilizes the Showdown calculator for accuracy while the interface behaves like an intelligent text editor.",
        bullets: [
          "Fuzzy matching for Pokemon and moves to reduce typing errors.",
          "Native support for Mega Evolutions and field states like Weather, Terrain, etc.",
          "URL sharing that preserves the full calc state or plain text result sharing.",
        ],
      },
      {
        eyebrow: "Workflow",
        title: "Prompt-First Editing",
        description:
          "Unburden is built to cut friction while testing matchups and creating sets, with the interface staying focused on speed and readability.",
        bullets: [
          "Fast autocomplete and editing for species, items, abilities, moves, and spreads.",
          "Side summaries let you tune set, stats, form, and battle context without leaving the calc flow.",
          "Immediate Min, Mid, and Max bulk comparison helps with quick team-building decisions.",
          "Sharing stays lightweight through URL state and plain-text result output.",
        ],
      },
    ],
    support: {
      eyebrow: "Support and Community",
      title: "Help Grow the Ecosystem",
      description:
        "Unburden is a project in progress. If you found bugs or have ideas for the prompt grammar, your feedback matters.",
      notes: [
        "Report problems or suggest features through GitHub Issues.",
        "Follow the project roadmap updates.",
        "Unburden remains proprietary and is not open source.",
      ],
    },
  },
};
