import type { DispatchProps, RunProps } from "../app/types";
import { CharacterToken } from "../components/CharacterToken";
import { mapNodes } from "../domain/content";

type MapScreenProps = DispatchProps & RunProps;

export function MapScreen({ dispatch, run }: MapScreenProps) {
  return (
    <section className="screen map-screen" aria-labelledby="map-heading">
      <div className="screen-heading">
        <h1 id="map-heading" className="display-title">
          ROADMAP
        </h1>
        <div className="squad-strip" aria-label="Current squad">
          {run?.squad.map((developerId) => (
            <CharacterToken key={developerId} developerId={developerId} compact />
          ))}
        </div>
      </div>

      <div className="map-path" aria-label="Run map">
        {mapNodes.map((node, index) => {
          const complete = run?.completedNodeIds.includes(node.id) ?? false;
          return (
            <button
              className="map-node"
              style={{ "--node-index": index } as React.CSSProperties}
              type="button"
              key={node.id}
              disabled={complete}
              onClick={() => dispatch({ type: "VISIT_NODE", nodeId: node.id })}
            >
              <span>{complete ? "✓" : index + 1}</span>
              <strong>{node.title}</strong>
              <small>{complete ? "Done" : node.kind}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
