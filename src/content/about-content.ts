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
  workflow: {
    eyebrow: string;
    badge: string;
    steps: Array<{
      title: string;
      description: string;
    }>;
  };
  cards: AboutCardContent[];
  dataSources: {
    eyebrow: string;
    title: string;
    description: string;
    notes: string[];
    links?: AboutLink[];
  };
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
        "Um workspace prompt-first para cálculos de dano e benchmarks de Speed em Pokemon Champions.",
      description:
        "O Unburden foi projetado para agilizar o teambuilding competitivo. Em vez de preencher formulários longos, você descreve matchups e interações de Speed em texto, ajusta as premissas visíveis e compartilha o estado completo. É feito para responder rapidamente: isto sobrevive, isto passa na Speed, e qual premissa mudou o resultado?",
      highlights: [
        "Gramática de prompt simples para matchups, modificadores e checagens rápidas.",
        "Cálculo de dano com comparação simultânea entre Min, Mid e Max bulk.",
        "Ladder de Speed para visualizar tiers, empates e thresholds de move order.",
      ],
    },
    workflow: {
      eyebrow: "Como funciona",
      badge: "3 passos",
      steps: [
        {
          title: "Escreva um matchup",
          description:
            "Digite atacante, golpe, defensor e contexto de batalha em um único prompt.",
        },
        {
          title: "Revise as premissas",
          description:
            "Confira sets, bulk, itens, abilities, efeitos de campo e modificadores de Speed antes de confiar no resultado.",
        },
        {
          title: "Leia e compartilhe",
          description:
            "Use a faixa de dano ou threshold de Speed, depois copie uma URL ou texto de resultado para suas notas de teste.",
        },
      ],
    },
    cards: [
      {
        eyebrow: "O Desenvolvedor",
        title: "Leandro Mesquita",
        description:
          "Desenvolvedor web/mobile e entusiasta do cenário competitivo de Pokemon/VGC.",
        bullets: [
          "Estudante de Ciência da Computação",
          "Jogador competitivo de Pokemon Champions e VGC",
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
        title: "Premissas Visíveis",
        description:
          "O Unburden utiliza o motor de cálculos do Showdown para precisão, enquanto a interface mantém espécies, sets, modificadores e contexto de batalha fáceis de revisar.",
        bullets: [
          "Fuzzy matching para Pokemon e golpes, reduzindo erros de digitação.",
          "Suporte para Mega Evoluções, Weather, Terrain, Trick Room e modificadores de Speed.",
          "Compartilhamento via URL que preserva o estado completo do cálculo ou benchmark.",
        ],
      },
      {
        eyebrow: "Fluxo de Trabalho",
        title: "Loop de Iteração Rápida",
        description:
          "O Unburden foi projetado para reduzir atrito durante testes de matchup e criação de sets, mantendo o foco em velocidade e clareza.",
        bullets: [
          "Autocomplete e edição rápida para espécies, itens, abilities, golpes e spreads.",
          "Resumo lateral para ajustar set, stats, forma e contexto de batalha sem trocar de tela.",
          "Comparação imediata de dano e tiers de Speed para acelerar decisões de teambuilding.",
          "Fluxo pensado para testes curtos, revisão de calcs e compartilhamento rápido por URL ou texto.",
        ],
      },
    ],
    dataSources: {
      eyebrow: "Dados de Meta",
      title: "Benchmarks e sets informados por Pikalytics",
      description:
        "Os dados atuais de meta do Pokemon Champions VGC, incluindo uso, itens comuns, abilities e padrões usados em benchmarks, são informados pelo Pikalytics quando disponíveis.",
      notes: [
        "O Unburden usa esses dados para acelerar o ponto de partida de resumos, sugestões e tiers de Speed.",
        "Dados do Pikalytics são um ponto de partida, não uma garantia de legalidade, otimização ou uso atual em torneios.",
        "O Unburden não é afiliado ao Pikalytics.",
      ],
      links: [{ label: "Pikalytics", href: "https://www.pikalytics.com/" }],
    },
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
      title: "A prompt-first VGC workspace for damage calcs and Speed benchmarks.",
      description:
        "Unburden is designed to speed up competitive teambuilding. Instead of filling long forms, you describe matchups and Speed interactions in text, tune visible assumptions, and share the full state. It is built for quickly answering: does this survive, what outspeeds this, and which assumption changed the result?",
      highlights: [
        "Fast prompt grammar for matchups, modifiers, and quick checks.",
        "Damage calculation comparing Min, Mid, and Max bulk at the same time.",
        "Speed ladder for reading tiers, ties, and move-order thresholds.",
      ],
    },
    workflow: {
      eyebrow: "How it works",
      badge: "3 steps",
      steps: [
        {
          title: "Write a matchup",
          description:
            "Type the attacker, move, defender, and battle context in one prompt.",
        },
        {
          title: "Review assumptions",
          description:
            "Check sets, bulk, items, abilities, field effects, and Speed modifiers before trusting the result.",
        },
        {
          title: "Read and share",
          description:
            "Use the damage range or Speed threshold, then copy a URL or result text for testing notes.",
        },
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
          "Competitive Pokemon Champions and VGC player",
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
        title: "Visible Assumptions",
        description:
          "Unburden uses the Showdown calculator for accuracy while keeping species, sets, modifiers, and battle context easy to inspect.",
        bullets: [
          "Fuzzy matching for Pokemon and moves to reduce typing errors.",
          "Native support for Mega Evolutions, Weather, Terrain, Trick Room, and Speed modifiers.",
          "URL sharing that preserves the full calc or benchmark state.",
        ],
      },
      {
        eyebrow: "Workflow",
        title: "Fast Iteration Loop",
        description:
          "Unburden is built to cut friction while testing matchups and creating sets, with the interface staying focused on speed and readability.",
        bullets: [
          "Fast autocomplete and editing for species, items, abilities, moves, and spreads.",
          "Side summaries let you tune set, stats, form, and battle context without leaving the calc flow.",
          "Immediate damage ranges and Speed tiers help with quick team-building decisions.",
          "Sharing stays lightweight through URL state and plain-text result output.",
        ],
      },
    ],
    dataSources: {
      eyebrow: "Meta Data",
      title: "Benchmarks and sets informed by Pikalytics",
      description:
        "Current Pokemon Champions VGC meta data, including usage, common items, abilities, and benchmark defaults, is informed by Pikalytics where available.",
      notes: [
        "Unburden uses this data to make summaries, suggestions, and Speed tiers faster to start from.",
        "Pikalytics data is a starting point, not a guarantee of legality, optimality, or current tournament usage.",
        "Unburden is not affiliated with Pikalytics.",
      ],
      links: [{ label: "Pikalytics", href: "https://www.pikalytics.com/" }],
    },
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
