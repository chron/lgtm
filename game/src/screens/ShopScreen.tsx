import type { DispatchProps, RunProps } from "../app/types";

type ShopScreenProps = DispatchProps & RunProps;

export function ShopScreen({ dispatch, run }: ShopScreenProps) {
  return (
    <section className="screen" aria-labelledby="shop-heading">
      <div className="screen-heading">
        <h1 id="shop-heading" className="display-title">
          TOOL SHOP
        </h1>
        <span>${run?.credits ?? 0}</span>
      </div>

      <div className="shop-shelf">
        <button className="shop-item" type="button" disabled>
          <strong>Green Check</strong>
          <span>Passive tool</span>
          <small>$80</small>
        </button>
        <button className="shop-item" type="button" disabled>
          <strong>Thin Deck</strong>
          <span>Remove a card</span>
          <small>$60</small>
        </button>
      </div>

      <div className="screen-actions">
        <button
          className="button button--secondary"
          type="button"
          onClick={() => dispatch({ type: "LEAVE_NODE" })}
        >
          Leave
        </button>
      </div>
    </section>
  );
}
