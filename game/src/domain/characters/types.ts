import type { CardDefinition, Developer, DeveloperId } from "../models";

type OwnedCard<TDeveloperId extends DeveloperId> = CardDefinition & {
  ownerId: TDeveloperId;
};

export interface CharacterContent<TDeveloperId extends DeveloperId = DeveloperId> {
  developer: Developer & { id: TDeveloperId };
  startingCard: OwnedCard<TDeveloperId>;
  rewardCards: readonly OwnedCard<TDeveloperId>[];
}
