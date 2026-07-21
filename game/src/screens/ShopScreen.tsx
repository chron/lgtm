import { CircleDollarSign, Copy, RefreshCw, Trash2, Wrench } from "lucide-react";
import { useState } from "react";
import sharkimedesArt from "../assets/mascots/research.svg";
import type { DispatchProps, RunProps } from "../app/types";
import { CardCollectionBrowser, CardCollectionEntry } from "../components/CardCollectionBrowser";
import { CharacterPortrait } from "../components/CharacterPortrait";
import { getCard, getDeveloper, getTool } from "../domain/content";
import {
  canDuplicateCard,
  canRefactorCard,
  minimumDeckSize,
  shopRefreshPrice,
  shopServicePrices,
  type ShopCardOffer,
  type ShopInventoryState,
  type ShopServiceId,
  type ShopToolOffer,
} from "../domain/shop";

type ShopScreenProps = DispatchProps &
  RunProps & {
    inventory: ShopInventoryState;
    onInspectDeck: () => void;
  };

const serviceCopy: Readonly<
  Record<ShopServiceId, { name: string; rules: string; icon: typeof Trash2 }>
> = {
  refactor: { name: "Refactor", rules: "Remove one card.", icon: Trash2 },
  duplicate: { name: "Clone", rules: "Copy one non-Rare card.", icon: Copy },
  "debt-cleanup": {
    name: "Clean Debt",
    rules: "Remove 3 Tech Debt.",
    icon: CircleDollarSign,
  },
};

function sharkimedesLine(inventory: ShopInventoryState): string {
  if (inventory.refreshCount > 0) return "new plugins just dropped. changelog is vibes based";
  if (inventory.purchasedOfferIds.length > 0)
    return "huge install. permissions review pending indefinitely";
  return "omg bestie these addons are literally production ready";
}

export function ShopScreen({ dispatch, run, inventory, onInspectDeck }: ShopScreenProps) {
  const [openService, setOpenService] = useState<"refactor" | "duplicate">();
  if (!run) return null;
  const refreshPrice = shopRefreshPrice(inventory.refreshCount);

  return (
    <section className="screen shop-screen" aria-labelledby="shop-heading">
      <header className="shop-heading">
        <div>
          <span>#sharkimedes</span>
          <h1 id="shop-heading">MARKETPLACE</h1>
        </div>
        <div className="shop-wallet">
          <CardCollectionEntry count={run.deck.length} onOpen={onInspectDeck} />
        </div>
      </header>

      <div className="shop-layout">
        <aside className="shop-vendor" aria-label="Sharkimedes">
          <div className="shop-vendor__avatar">
            <img src={sharkimedesArt} alt="Sharkimedes" draggable={false} />
            <i aria-hidden="true" />
          </div>
          <div className="shop-vendor__message">
            <strong>sharkimedes</strong>
            <p>{sharkimedesLine(inventory)}</p>
          </div>
          <button
            className="shop-refresh"
            type="button"
            disabled={run.credits < refreshPrice}
            onClick={() => dispatch({ type: "REFRESH_SHOP" })}
          >
            <RefreshCw aria-hidden="true" strokeWidth={3} />
            <span>Refresh</span>
            <b>${refreshPrice}</b>
          </button>
        </aside>

        <div className="shop-stock">
          <section className="shop-cards" aria-labelledby="shop-cards-heading">
            <h2 id="shop-cards-heading">Apps</h2>
            <div className="shop-card-grid">
              {inventory.cardOffers.map((offer) => (
                <ShopCard
                  key={offer.id}
                  offer={offer}
                  credits={run.credits}
                  sold={inventory.purchasedOfferIds.includes(offer.id)}
                  onBuy={() => dispatch({ type: "BUY_SHOP_CARD", offerId: offer.id })}
                />
              ))}
            </div>
          </section>

          <div className="shop-utilities">
            <section className="shop-tools" aria-labelledby="shop-tools-heading">
              <h2 id="shop-tools-heading">Tools</h2>
              <div className="shop-tool-grid">
                {inventory.toolOffers.map((offer) => (
                  <ShopTool
                    key={offer.id}
                    offer={offer}
                    credits={run.credits}
                    sold={inventory.purchasedOfferIds.includes(offer.id)}
                    onBuy={() => dispatch({ type: "BUY_SHOP_TOOL", offerId: offer.id })}
                  />
                ))}
              </div>
            </section>

            <section className="shop-services" aria-labelledby="shop-services-heading">
              <h2 id="shop-services-heading">Services</h2>
              <div className="shop-service-grid">
                {(Object.keys(serviceCopy) as ShopServiceId[]).map((serviceId) => {
                  const service = serviceCopy[serviceId];
                  const Icon = service.icon;
                  const used = inventory.usedServiceIds.includes(serviceId);
                  const unavailable =
                    serviceId === "refactor"
                      ? run.deck.length <= minimumDeckSize
                      : serviceId === "duplicate"
                        ? !run.deck.some(canDuplicateCard)
                        : run.techDebt <= 0;
                  const disabled =
                    run.credits < shopServicePrices[serviceId] ||
                    unavailable ||
                    (serviceId !== "debt-cleanup" && used);
                  return (
                    <button
                      className={`shop-service shop-service--${serviceId}`}
                      type="button"
                      key={serviceId}
                      disabled={disabled}
                      onClick={() => {
                        if (serviceId === "debt-cleanup") {
                          dispatch({ type: "BUY_SHOP_SERVICE", serviceId });
                        } else {
                          setOpenService(serviceId);
                        }
                      }}
                    >
                      <Icon aria-hidden="true" strokeWidth={3} />
                      <span>
                        <strong>{service.name}</strong>
                        <small>
                          {used && serviceId !== "debt-cleanup"
                            ? "Used"
                            : unavailable
                              ? serviceId === "debt-cleanup"
                                ? "No Debt"
                                : serviceId === "refactor"
                                  ? "Deck minimum"
                                  : "No eligible cards"
                              : service.rules}
                        </small>
                      </span>
                      <b>${shopServicePrices[serviceId]}</b>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="shop-actions">
        <button
          className="button button--secondary"
          type="button"
          onClick={() => dispatch({ type: "LEAVE_NODE" })}
        >
          Leave
        </button>
      </div>

      {openService && (
        <CardCollectionBrowser
          cards={run.deck}
          title={openService === "refactor" ? "Refactor" : "Clone"}
          mode="choose-one"
          confirmLabel={openService === "refactor" ? "Remove" : "Duplicate"}
          canChoose={(instance) =>
            openService === "refactor" ? canRefactorCard(run, instance) : canDuplicateCard(instance)
          }
          onChoose={(instanceId) => {
            dispatch({ type: "BUY_SHOP_SERVICE", serviceId: openService, instanceId });
            setOpenService(undefined);
          }}
          onClose={() => setOpenService(undefined)}
        />
      )}
    </section>
  );
}

interface ShopCardProps {
  offer: ShopCardOffer;
  credits: number;
  sold: boolean;
  onBuy: () => void;
}

function ShopCard({ offer, credits, sold, onBuy }: ShopCardProps) {
  const card = getCard(offer.cardId);
  const owner = card.ownerId ? getDeveloper(card.ownerId) : undefined;
  const disabled = sold || credits < offer.price;
  return (
    <button
      className={`shop-card${sold ? " is-sold" : ""}${offer.kind === "wildcard" ? " is-wildcard" : ""}`}
      style={{ "--shop-accent": owner?.accent ?? "var(--pink)" } as React.CSSProperties}
      type="button"
      disabled={disabled}
      onClick={onBuy}
      aria-label={`${sold ? "Installed: " : "Buy "}${card.name} for ${offer.price} Credits. ${card.rules}`}
    >
      <span className="shop-card__price">{sold ? "Installed" : `$${offer.price}`}</span>
      <span className="shop-card__focus" aria-label={`Costs ${card.cost} Focus`}>
        {card.cost}
      </span>
      <small>{offer.kind === "wildcard" ? "Wildcard" : owner?.name}</small>
      <strong>{card.name}</strong>
      <p>{card.rules}</p>
      <span className="shop-card__tags">
        {card.rarity === "rare" && <i>Rare</i>}
        {card.tags.includes("ai-assisted") && <i>AI</i>}
        {card.tags.includes("automation") && <i>Automation</i>}
        {card.tags.includes("review") && <i>Review</i>}
      </span>
      {owner && <CharacterPortrait developerId={owner.id} mode="card" decorative eager />}
    </button>
  );
}

interface ShopToolProps {
  offer: ShopToolOffer;
  credits: number;
  sold: boolean;
  onBuy: () => void;
}

function ShopTool({ offer, credits, sold, onBuy }: ShopToolProps) {
  const tool = getTool(offer.toolId);
  return (
    <button
      className={`shop-tool${sold ? " is-sold" : ""}`}
      type="button"
      disabled={sold || credits < offer.price}
      onClick={onBuy}
      aria-label={`${sold ? "Installed: " : "Buy "}${tool.name} for ${offer.price} Credits. ${tool.rules}`}
    >
      <span className="shop-tool__hardware" aria-hidden="true">
        <Wrench strokeWidth={3} />
        <b>{tool.symbol}</b>
      </span>
      <span>
        <strong>{tool.name}</strong>
        <small>{tool.rules}</small>
      </span>
      <b>{sold ? "Installed" : `$${offer.price}`}</b>
    </button>
  );
}
