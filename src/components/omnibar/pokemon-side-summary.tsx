"use client";

import { Trash2 } from "lucide-react";

import type { SummarySide } from "@/lib/parser/input-mutations";
import { ImportSetModal } from "@/components/omnibar/import-set-modal";
import { PokemonSetEditorModal } from "@/components/omnibar/pokemon-set-editor-modal";
import { SummaryEmptyState } from "@/components/omnibar/pokemon-summary/summary-empty-state";
import { SummaryHeader } from "@/components/omnibar/pokemon-summary/summary-header";
import { SummaryIdentityCard } from "@/components/omnibar/pokemon-summary/summary-identity-card";
import { SummaryMoves } from "@/components/omnibar/pokemon-summary/summary-moves";
import { SummarySetActions } from "@/components/omnibar/pokemon-summary/summary-set-actions";
import { SummarySpSpread } from "@/components/omnibar/pokemon-summary/summary-sp-spread";
import { SummaryStatsGrid } from "@/components/omnibar/pokemon-summary/summary-stats-grid";
import { getNatureEffect } from "@/components/omnibar/pokemon-summary/shared";
import { usePokemonSideSummaryController } from "@/components/omnibar/use-pokemon-side-summary-controller";

export function PokemonSideSummary({ side }: { side: SummarySide }) {
  const {
    currentStatPoints,
    editorInitialSet,
    editorModalKey,
    editorOpen,
    handleEditorSave,
    handleInlineStatInputChange,
    handleInlineStatPointChange,
    handleRemoveSet,
    handleSaveCurrentSet,
    handleSelectSetBySpeciesId,
    handleSwitchToMegaForm,
    importModalOpen,
    importedSetList,
    isSpDepleted,
    onSelectMove,
    openEditor,
    openImportModal,
    otherSets,
    resolvedSetId,
    setEditorOpen,
    setImportModalOpen,
    spLeft,
    statInputDrafts,
    summary,
    switchOpen,
    switchRef,
    toggleSwitch,
  } = usePokemonSideSummaryController(side);

  if (!summary) {
    return (
      <>
        <SummaryEmptyState
          side={side}
          hasImportedSets={importedSetList.length > 0}
          importedSetList={importedSetList}
          onSelectSet={handleSelectSetBySpeciesId}
          onRemoveSet={handleRemoveSet}
          onOpenImport={openImportModal}
        />

        {importModalOpen && (
          <ImportSetModal onClose={() => setImportModalOpen(false)} />
        )}
      </>
    );
  }

  const { importedSet, stageBoosts, itemBoosts } = summary;
  const isMegaActive = summary.isMega;

  return (
    <aside
      data-testid={`${side}-summary`}
      className="theme-panel rounded-[28px] p-5"
    >
      <SummaryHeader
        title={summary.title}
        megaToggle={
          summary.megaTarget ? (
            <button
              type="button"
              onClick={() => {
                const megaTarget = summary.megaTarget;
                if (megaTarget) {
                  handleSwitchToMegaForm(megaTarget);
                }
              }}
              aria-label={
                isMegaActive ? "Switch to base form" : "Switch to mega form"
              }
              title={isMegaActive ? "Mega form active" : "Mega form"}
              aria-pressed={isMegaActive}
              className={`theme-icon-button theme-icon-button-mega flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full p-0 ${
                isMegaActive
                  ? "theme-icon-button-mega-active"
                  : "theme-icon-button-mega-inactive"
              }`}
            >
              <span
                aria-hidden="true"
                className="block h-6.5 w-6.5 shrink-0"
                style={{
                  backgroundColor: "var(--mega-icon-color)",
                  maskImage: "url('/icons/mega-icon.svg')",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  maskSize: "100% 100%",
                  WebkitMaskImage: "url('/icons/mega-icon.svg')",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  WebkitMaskSize: "100% 100%",
                }}
              />
            </button>
          ) : null
        }
        removeAction={
          importedSet && resolvedSetId ? (
            <button
              type="button"
              aria-label={`Remove ${summary.name} set`}
              title="Remove set"
              onClick={() => {
                handleRemoveSet(resolvedSetId);
              }}
              className="theme-icon-button flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
              style={{ color: "var(--accent-text-mid)" }}
            >
              <Trash2 aria-hidden="true" size={15} strokeWidth={1.9} />
            </button>
          ) : null
        }
      />

      <SummaryIdentityCard
        name={summary.name}
        spriteSources={summary.spriteSources}
        primaryType={summary.primaryType}
        ability={summary.ability}
        item={summary.item}
        move={summary.move}
        moveType={summary.activeMoveEntry?.type ?? null}
        side={side}
        displayNature={
          !summary.isBaseStats || summary.nature !== "Hardy"
            ? summary.nature
            : null
        }
      />

      {importedSet && (
        <SummaryMoves
          importedSet={importedSet}
          activeMoveId={summary.activeMoveEntry?.id ?? null}
          side={side}
          onSelectMove={onSelectMove}
        />
      )}

      <SummaryStatsGrid
        natureEffects={{
          atk: getNatureEffect(summary.nature, "atk"),
          def: getNatureEffect(summary.nature, "def"),
          spa: getNatureEffect(summary.nature, "spa"),
          spd: getNatureEffect(summary.nature, "spd"),
          spe: getNatureEffect(summary.nature, "spe"),
        }}
        stats={summary.stats}
        stageBoosts={stageBoosts}
        itemBoosts={itemBoosts}
        showLevelLabel={Boolean(importedSet || summary.promptStatPoints)}
        level={importedSet?.level ?? 50}
      />

      <SummarySpSpread
        side={side}
        currentStatPoints={currentStatPoints}
        isSpDepleted={isSpDepleted}
        spLeft={spLeft}
        statInputDrafts={statInputDrafts}
        onChangeInput={handleInlineStatInputChange}
        onChangeSlider={(statKey, requested, maxValue) => {
          handleInlineStatPointChange(statKey, Math.min(requested, maxValue));
        }}
      />

      <SummarySetActions
        importedSet={importedSet}
        otherSets={otherSets}
        switchOpen={switchOpen}
        switchRef={switchRef}
        onToggleSwitch={toggleSwitch}
        onSelectSet={(set) => handleSelectSetBySpeciesId(set.speciesId)}
        onSave={handleSaveCurrentSet}
        onEdit={openEditor}
        onImport={openImportModal}
        canSave={Boolean(editorInitialSet)}
      />

      {importModalOpen && (
        <ImportSetModal onClose={() => setImportModalOpen(false)} />
      )}
      {editorOpen && editorInitialSet && (
        <PokemonSetEditorModal
          key={editorModalKey ?? undefined}
          initialSet={editorInitialSet}
          onClose={() => setEditorOpen(false)}
          onSave={handleEditorSave}
        />
      )}
    </aside>
  );
}
