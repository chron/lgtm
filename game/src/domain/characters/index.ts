import type { CardDefinition, Developer } from "../models";
import { ireneContent } from "./irene";
import { madiContent } from "./madi";
import { odinContent } from "./odin";
import { paulContent } from "./paul";
import type { CharacterContent } from "./types";

export const characterContents = [paulContent, odinContent, ireneContent, madiContent] as const;

const characterContentCatalog: readonly CharacterContent[] = characterContents;

export const developers: readonly Developer[] = characterContentCatalog.map(
  (content) => content.developer,
);

export const characterStartingCards: readonly CardDefinition[] = characterContentCatalog.map(
  (content) => content.startingCard,
);

export const characterRewardCards: readonly CardDefinition[] = characterContentCatalog.flatMap(
  (content) => content.rewardCards,
);
