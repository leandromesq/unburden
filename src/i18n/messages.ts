import {
  aboutContentByLocale,
  type AboutContent,
} from "@/content/about-content";
import { enDictionary } from "@/i18n/messages/en";
import { ptBRDictionary } from "@/i18n/messages/pt-BR";
import type { AppLocale } from "@/i18n/locales";
import type { AppDictionary } from "@/i18n/types";
import type { OmniIssue } from "@/lib/types";

const dictionaries: Record<AppLocale, AppDictionary> = {
  en: enDictionary,
  "pt-BR": ptBRDictionary,
};

export function getDictionary(locale: AppLocale) {
  return dictionaries[locale];
}

export function getAboutContent(locale: AppLocale): AboutContent {
  return aboutContentByLocale[locale];
}

export function formatIssue(issue: OmniIssue, dictionary: AppDictionary) {
  const ptBR = dictionary === ptBRDictionary;

  switch (issue.id) {
    case "parser.use_separator":
      return ptBR
        ? "Use x para separar atacante e defensor."
        : "Use x to split attacker and defender.";
    case "parser.unknown_saved_set_reference":
      return ptBR
        ? `Referencia de set salvo desconhecida: ${String(issue.values?.reference ?? "")}`
        : `Unknown saved set reference: ${String(issue.values?.reference ?? "")}`;
    case "parser.saved_set_reference_attacker_slot_only":
      return ptBR
        ? "Referencias de set salvo devem ocupar sozinhas o slot do Pokemon atacante."
        : "Saved set references must occupy the attacker pokemon slot alone.";
    case "parser.saved_set_reference_defender_slot_only":
      return ptBR
        ? "Referencias de set salvo devem ocupar sozinhas o slot do Pokemon defensor."
        : "Saved set references must occupy the defender pokemon slot alone.";
    case "parser.could_not_resolve_attacker":
      return ptBR
        ? "Nao foi possivel determinar o atacante."
        : "Could not resolve attacker.";
    case "parser.could_not_resolve_defender":
      return ptBR
        ? "Nao foi possivel determinar o defensor."
        : "Could not resolve defender.";
    case "parser.invalid_attacker_post_move_tokens":
      return ptBR
        ? "Tokens do atacante após !move precisam usar estruturas válidas por segmento como @item, %75, sp:32/0/0/0/0/0, [Ability], +1, +nature, timid ou helping-hand."
        : "Attacker tokens after !move must use known segment-scoped forms like @item, %75, sp:32/0/0/0/0/0, [Ability], +1, +nature, timid, or helping-hand.";
    case "parser.invalid_defender_post_move_tokens":
      return ptBR
        ? "Tokens do defensor precisam usar estruturas válidas por segmento como @item, %75, sp:32/0/0/0/0/0, [Ability], +1, +nature, calm ou reflect."
        : "Defender tokens must use known segment-scoped forms like @item, %75, sp:32/0/0/0/0/0, [Ability], +1, +nature, calm, or reflect.";
    case "parser.use_explicit_move_token":
      return ptBR
        ? "Use !<move> para o golpe do atacante."
        : "Use !<move> for the attacker move.";
    case "parser.add_attacker_move":
      return ptBR
        ? "Adicione um golpe explícito do atacante com !<move>."
        : "Add an explicit attacker move with !<move>.";
    case "parser.could_not_resolve_move":
      return ptBR
        ? "Nao foi possível determinar o golpe do atacante."
        : "Could not resolve attacker move.";
    case "parser.invalid_move_hit_count":
      return ptBR
        ? "A contagem de hits do golpe precisa ser entre 1 e 10."
        : "Move hit count must be between 1 and 10.";
    case "parser.invalid_defender_token":
      return ptBR
        ? "Token de defensor não reconhecido. Use tokens por segmento como @item, %75, sp:32/0/0/0/0/0, [Ability], +nature, calm, reflect ou ~rain."
        : "Unrecognized defender token. Use segment-scoped tokens like @item, %75, sp:32/0/0/0/0/0, [Ability], +nature, calm, reflect, or ~rain.";
    case "parser.invalid_spread":
      return ptBR
        ? "SP spreads devem usar sp:hp/atk/def/spa/spd/spe com seis valores, maximo de 32 em cada um e 66 no total."
        : "SP spreads must use sp:hp/atk/def/spa/spd/spe with six values, max 32 each and 66 total.";
    case "parser.tokens_wrong_side":
      return ptBR
        ? "Alguns tokens foram colocados no lado errado do separador."
        : "Some tokens were placed on the wrong side of the separator.";
    case "parser.unknown_modifier":
      return ptBR
        ? `Token de modificador desconhecido: ${String(issue.values?.token ?? "")}`
        : `Unknown modifier token: ${String(issue.values?.token ?? "")}`;
    case "parser.unknown_attacker_item":
      return ptBR
        ? `Item do atacante desconhecido: ${String(issue.values?.token ?? "")}`
        : `Unknown attacker item: ${String(issue.values?.token ?? "")}`;
    case "parser.unknown_defender_item":
      return ptBR
        ? `Item do defensor desconhecido: ${String(issue.values?.token ?? "")}`
        : `Unknown defender item: ${String(issue.values?.token ?? "")}`;
    case "parser.legacy_prefixes_removed":
      return ptBR
        ? "Os prefixos legados >, <, a:, d: e g: nao sao mais suportados."
        : "Legacy prefixes >, <, a:, d:, and g: are no longer supported.";
    case "parser.could_not_resolve_attacker_ability":
      return ptBR
        ? "Nao foi possivel determinar a ability do atacante."
        : "Could not resolve attacker ability.";
    case "parser.could_not_resolve_defender_ability":
      return ptBR
        ? "Nao foi possivel determinar a ability do defensor."
        : "Could not resolve defender ability.";
  }
}
