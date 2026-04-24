"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  ClipboardCopy,
  Save,
  Trash2,
} from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";
import type { SummarySide } from "@/lib/parser/input-mutations";
import { formatImportedSetAsShowdown } from "@/lib/team/showdown-export";
import { ImportSetModal } from "@/components/omnibar/import-set-modal";
import { SummaryEmptyState } from "@/components/omnibar/pokemon-summary/summary-empty-state";
import { SummaryHeader } from "@/components/omnibar/pokemon-summary/summary-header";
import { SummaryIdentityCard } from "@/components/omnibar/pokemon-summary/summary-identity-card";
import { SummaryMoves } from "@/components/omnibar/pokemon-summary/summary-moves";
import { SummarySetActions } from "@/components/omnibar/pokemon-summary/summary-set-actions";
import { SummarySpSpread } from "@/components/omnibar/pokemon-summary/summary-sp-spread";
import { SummaryStatsGrid } from "@/components/omnibar/pokemon-summary/summary-stats-grid";
import { SearchableCombobox } from "@/components/omnibar/searchable-combobox";
import { getNatureEffect } from "@/components/omnibar/pokemon-summary/shared";
import { usePokemonSideSummaryController } from "@/components/omnibar/use-pokemon-side-summary-controller";

function fallbackCopyText(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function PokemonSideSummary({ side }: { side: SummarySide }) {
  const { dictionary } = useI18n();
  const {
    abilityInput,
    abilityOptions,
    canSaveSet,
    currentStatPoints,
    getCurrentExportSet,
    handleInlineStatInputChange,
    handleInlineStatPointChange,
    handleAbilityInputChange,
    handleItemInputChange,
    handleMoveInputChange,
    handleNicknameChange,
    handleRemoveSet,
    handleSaveCurrentSet,
    handleStageValueChange,
    handleSelectSetBySpeciesId,
    handleSwitchToMegaForm,
    importModalOpen,
    importedSetList,
    isSpDepleted,
    itemInput,
    itemOptions,
    moveInputTypes,
    moveInputs,
    moveOptions,
    nicknameInput,
    onCommitAbility,
    onCommitItem,
    onCommitMove,
    onCommitNature,
    onCommitNickname,
    onCommitSpecies,
    onCommitStatus,
    onInputSpecies,
    onInputStatus,
    onSelectMove,
    openImportModal,
    otherSets,
    resolvedSetId,
    setImportModalOpen,
    speciesInput,
    speciesOptions,
    statusInput,
    statusOptions,
    spLeft,
    statInputDrafts,
    summary,
    switchOpen,
    switchRef,
    toggleSwitch,
  } = usePokemonSideSummaryController(side);
  const [copiedSet, setCopiedSet] = useState(false);
  const copiedTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  if (!summary) {
    return (
      <>
        <SummaryEmptyState
          side={side}
          hasImportedSets={importedSetList.length > 0}
          importedSetList={importedSetList}
          speciesInput={speciesInput}
          speciesOptions={speciesOptions}
          onSelectSet={handleSelectSetBySpeciesId}
          onRemoveSet={handleRemoveSet}
          onInputSpecies={onInputSpecies}
          onCommitSpecies={onCommitSpecies}
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
  const setNameField = (
    <div className="flex min-w-0 items-center gap-2">
      <label className="sr-only" htmlFor={`${side}-summary-set-name`}>
        Set Name
      </label>
      <input
        id={`${side}-summary-set-name`}
        type="text"
        aria-label="Set Name"
        value={nicknameInput}
        onChange={(event) => handleNicknameChange(event.currentTarget.value)}
        onBlur={() => onCommitNickname()}
        placeholder="set name"
        className="theme-control theme-input h-8.5 w-full min-w-0 rounded-lg px-3 text-sm"
      />
    </div>
  );
  const statusField = (
    <div className="min-w-0">
      <SearchableCombobox
        label="Status"
        hideLabel
        compact
        name="pokemon-status"
        value={statusInput}
        options={statusOptions}
        placeholder="Status"
        onChange={onInputStatus}
        onInputChange={onInputStatus}
        onSelectOption={onCommitStatus}
        onBlur={onCommitStatus}
        showAllOptions
      />
    </div>
  );

  const handleExportSet = async () => {
    const currentExportSet = getCurrentExportSet();
    if (!currentExportSet) {
      return;
    }

    const showdownText = formatImportedSetAsShowdown(currentExportSet);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(showdownText);
      } else {
        fallbackCopyText(showdownText);
      }
    } catch {
      fallbackCopyText(showdownText);
    }

    if (copiedTimeoutRef.current !== null) {
      window.clearTimeout(copiedTimeoutRef.current);
    }
    setCopiedSet(true);
    copiedTimeoutRef.current = window.setTimeout(() => {
      setCopiedSet(false);
    }, 1600);
  };

  return (
    <aside
      data-testid={`${side}-summary`}
      className="theme-panel min-w-0 overflow-hidden rounded-xl p-4 sm:p-5"
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
              className={`theme-icon-button theme-icon-button-mega flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg p-0 ${
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
          <>
            {canSaveSet ? (
              <button
                type="button"
                aria-label="Save"
                title="Save set"
                onClick={handleSaveCurrentSet}
                className="theme-icon-button theme-icon-button-sm shrink-0 text-sm"
                style={{ color: "var(--accent-text-mid)" }}
              >
                <Save aria-hidden="true" size={14} strokeWidth={2} />
              </button>
            ) : null}
            <button
              type="button"
              aria-label={dictionary.summary.import}
              title={dictionary.summary.import}
              onClick={openImportModal}
              className="theme-icon-button theme-icon-button-sm shrink-0 text-sm"
            >
              <ArrowDownToLine aria-hidden="true" size={15} strokeWidth={1.9} />
            </button>
            <button
              type="button"
              aria-label={dictionary.summary.export}
              title={copiedSet ? dictionary.summary.copied : dictionary.summary.export}
              onClick={() => void handleExportSet()}
              className={`theme-icon-button theme-icon-button-sm shrink-0 text-sm ${
                copiedSet ? "theme-icon-button-active" : ""
              }`}
            >
              {copiedSet ? (
                <Check aria-hidden="true" size={15} strokeWidth={2.1} />
              ) : (
                <ClipboardCopy aria-hidden="true" size={15} strokeWidth={1.9} />
              )}
            </button>
            {importedSet && resolvedSetId ? (
              <button
                type="button"
                aria-label={`Remove ${summary.name} set`}
                title="Remove set"
                onClick={() => {
                  handleRemoveSet(resolvedSetId);
                }}
                className="theme-icon-button theme-icon-button-sm shrink-0 text-sm"
                style={{ color: "var(--accent-text-mid)" }}
              >
                <Trash2 aria-hidden="true" size={15} strokeWidth={1.9} />
              </button>
            ) : null}
          </>
        }
      />

      <SummaryIdentityCard
        name={summary.name}
        spriteSources={summary.spriteSources}
        primaryType={summary.primaryType}
        speciesInput={speciesInput}
        speciesOptions={speciesOptions}
        ability={summary.ability}
        abilityInput={abilityInput}
        abilityOptions={abilityOptions}
        itemInput={itemInput}
        itemOptions={itemOptions}
        nature={summary.nature}
        setNameField={setNameField}
        switchAction={
          <SummarySetActions
            importedSet={importedSet}
            otherSets={otherSets}
            switchOpen={switchOpen}
            switchRef={switchRef}
            onToggleSwitch={toggleSwitch}
            onSelectSet={(set) => handleSelectSetBySpeciesId(set.speciesId)}
          />
        }
        statusField={statusField}
        onInputSpecies={onInputSpecies}
        onCommitSpecies={onCommitSpecies}
        onInputItem={handleItemInputChange}
        onInputAbility={handleAbilityInputChange}
        onCommitItem={onCommitItem}
        onCommitAbility={onCommitAbility}
        onCommitNature={onCommitNature}
      />

      <SummaryMoves
        activeMoveId={summary.activeMoveEntry?.id ?? null}
        side={side}
        moveInputs={moveInputs}
        moveOptions={moveOptions}
        moveInputTypes={moveInputTypes}
        onInputMove={handleMoveInputChange}
        onCommitMove={onCommitMove}
        onSelectMove={onSelectMove}
      />

      <SummaryStatsGrid
        natureEffects={{
          atk: getNatureEffect(summary.nature, "atk"),
          def: getNatureEffect(summary.nature, "def"),
          spa: getNatureEffect(summary.nature, "spa"),
          spd: getNatureEffect(summary.nature, "spd"),
          spe: getNatureEffect(summary.nature, "spe"),
        }}
        stats={summary.stats}
        currentHpPercent={summary.currentHpPercent}
        stageBoosts={stageBoosts}
        itemBoosts={itemBoosts}
        ability={summary.ability}
        status={summary.status}
        showLevelLabel={Boolean(importedSet || summary.promptStatPoints)}
        level={importedSet?.level ?? 50}
        onChangeStage={handleStageValueChange}
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

      {importModalOpen && (
        <ImportSetModal onClose={() => setImportModalOpen(false)} />
      )}
    </aside>
  );
}
