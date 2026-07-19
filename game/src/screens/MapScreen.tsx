import { useEffect, useRef } from "react";
import type { DispatchProps, RunProps } from "../app/types";
import { CardCollectionEntry } from "../components/CardCollectionBrowser";
import { CharacterToken } from "../components/CharacterToken";
import { getBossDefinition } from "../domain/bosses";
import { getCycle, getMapNodeCycleId, isMapNodeAvailable, mapNodes } from "../domain/content";
import type { MapNode, RunState } from "../domain/models";
import { effectiveMapEdges, revealedMapNodeIds } from "../game/eventResolution";

type MapScreenProps = DispatchProps &
  RunProps & {
    onInspectDeck: () => void;
  };

type MapNodeState = "available" | "current" | "locked" | "visited";

const mapNodeById = new Map(mapNodes.map((node) => [node.id, node]));

function getNodeState(node: MapNode, run: RunState): MapNodeState {
  if (node.id === run.currentNodeId) return "current";
  if (run.completedNodeIds.includes(node.id)) return "visited";
  return isMapNodeAvailable(node, run.currentNodeId, run.completedNodeIds, effectiveMapEdges(run))
    ? "available"
    : "locked";
}

function nodeGlyph(node: MapNode): string {
  switch (node.kind) {
    case "cycle":
      return "</>";
    case "incident":
      return "⚡";
    case "boss":
      return "!!";
    case "event":
      return "?";
    case "shop":
      return "$";
    case "retro":
      return "★";
  }
}

function nodeTypeLabel(node: MapNode): string {
  return node.kind === "retro"
    ? "Retro"
    : `${node.kind.slice(0, 1).toUpperCase()}${node.kind.slice(1)}`;
}

function visibleNodeLabel(
  node: MapNode,
  state: MapNodeState,
  revealed: ReadonlySet<string>,
  encounterTitle: string,
): string {
  if (
    node.kind === "event" ||
    (!revealed.has(node.id) && (state === "available" || state === "locked"))
  ) {
    return nodeTypeLabel(node);
  }
  return encounterTitle;
}

function nodeRewardLabel(node: MapNode): string | undefined {
  if (node.kind === "incident") return "Tool + Card";
  if (node.kind === "cycle") return "Card";
}

export function MapScreen({ dispatch, run, onInspectDeck }: MapScreenProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const edges = run ? effectiveMapEdges(run) : [];
  const revealed = run ? revealedMapNodeIds(run) : new Set<string>();
  const boss = run ? getBossDefinition(run.selectedBossId) : undefined;

  useEffect(() => {
    const viewport = viewportRef.current;
    const availableNodes = run
      ? mapNodes.filter((node) => getNodeState(node, run) === "available")
      : [];
    if (!viewport || availableNodes.length === 0) return;
    const activeY =
      availableNodes.reduce((total, node) => total + node.position.y, 0) / availableNodes.length;
    const canvas = viewport.firstElementChild;
    if (!(canvas instanceof HTMLElement)) return;
    const top = (activeY / 100) * canvas.offsetHeight - viewport.clientHeight / 2;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    viewport.scrollTo({ top: Math.max(0, top), behavior: reducedMotion ? "auto" : "smooth" });
  }, [run]);

  return (
    <section className="screen map-screen" aria-labelledby="map-heading">
      <div className="screen-heading">
        <h1 id="map-heading" className="display-title">
          ROADMAP
        </h1>
        <div className="collection-entry-group">
          <div className="squad-strip" aria-label="Current squad">
            {run?.squad.map((developerId) => (
              <CharacterToken key={developerId} developerId={developerId} compact />
            ))}
          </div>
          <CardCollectionEntry count={run?.deck.length ?? 0} onOpen={onInspectDeck} />
        </div>
      </div>

      {boss && (
        <aside className="boss-preview" aria-label={`Final Review: ${boss.stakeholder}`}>
          <div className="boss-preview__portrait">
            <img src={boss.portrait} alt="" />
            <span>Final Review</span>
          </div>
          <div className="boss-preview__copy">
            <small>Stakeholder</small>
            <strong>{boss.stakeholder}</strong>
            <b>{boss.projectTitle}</b>
            <p>{boss.warning}</p>
          </div>
          <span className="boss-preview__stamp">Revealed</span>
        </aside>
      )}

      <div className="map-viewport" ref={viewportRef} aria-label="Run map">
        <div className="map-canvas">
          <svg
            className="map-edges"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {edges.map((edge) => {
              const from = mapNodeById.get(edge.fromNodeId);
              const to = mapNodeById.get(edge.toNodeId);
              if (!from || !to) return null;
              const toState = run ? getNodeState(to, run) : "locked";
              const edgeState =
                run?.completedNodeIds.includes(edge.fromNodeId) &&
                run.completedNodeIds.includes(edge.toNodeId)
                  ? "visited"
                  : run?.currentNodeId === edge.fromNodeId && toState === "available"
                    ? "available"
                    : "locked";
              return (
                <line
                  key={`${edge.fromNodeId}-${edge.toNodeId}`}
                  className={`map-edge is-${edgeState}`}
                  x1={from.position.x}
                  y1={from.position.y}
                  x2={to.position.x}
                  y2={to.position.y}
                />
              );
            })}
          </svg>

          {mapNodes.map((node) => {
            const state = run ? getNodeState(node, run) : "locked";
            const typeLabel = nodeTypeLabel(node);
            const cycleId = run ? getMapNodeCycleId(node, run.seed) : node.cycleId;
            const encounterTitle = cycleId ? getCycle(cycleId).name : node.title;
            const visibleLabel = visibleNodeLabel(node, state, revealed, encounterTitle);
            const showsEncounterTitle = visibleLabel !== typeLabel;
            const rewardLabel = nodeRewardLabel(node);
            const stateLabel =
              state === "current"
                ? "Here"
                : state === "visited"
                  ? "Done"
                  : state === "available"
                    ? "Choose"
                    : "Locked";
            return (
              <button
                className={`map-node map-node--${node.kind} is-${state}`}
                style={{ left: `${node.position.x}%`, top: `${node.position.y}%` }}
                type="button"
                key={node.id}
                disabled={state !== "available"}
                onClick={() => dispatch({ type: "VISIT_NODE", nodeId: node.id })}
                aria-current={state === "current" ? "step" : undefined}
                aria-label={`${visibleLabel}${rewardLabel ? `, ${rewardLabel} reward` : ""}, ${stateLabel}`}
                data-map-node={node.id}
              >
                <span className="map-node__glyph" aria-hidden="true">
                  {nodeGlyph(node)}
                </span>
                <strong>{visibleLabel}</strong>
                <small className={showsEncounterTitle || rewardLabel ? undefined : "is-state-only"}>
                  {showsEncounterTitle && <span>{typeLabel}</span>}
                  {!showsEncounterTitle && rewardLabel && <em>{rewardLabel}</em>}
                  <b>{stateLabel}</b>
                </small>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
