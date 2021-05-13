import { testUtils } from "@keix/message-store-client";
import { v4 } from "uuid";
import { runGiftCard } from "../src/index2";
import {
  runCardExistProjector,
  runVerifyAmountProjector,
  runVerifyPendingProjector,
  runVerifyProcessingProjector,
} from "../src/projector";
import { CommandTypeCredit, EventTypeCredit } from "../src/typesCredits";
import { CommandTypeCard, EventTypeCard } from "../src/typesCard";

it("Aggiungere una carta", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: CommandTypeCard.ADD_GIFT_CARD,
      stream_name: "giftCard:command-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let event = testUtils.getStreamMessages("giftCard");
    expect(event).toHaveLength(1);
    expect(event[0].type).toEqual(EventTypeCard.GIFT_CARD_ADDED);
    expect(event[0].data.id).toEqual(idCard);
    expect(event[0].data.name).toEqual("Amazon");
    expect(event[0].data.amounts).toEqual([5, 10, 20, 30, 50]);
  });
});

it("Trovare una carta esistente", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
  ]);

  expect(await runCardExistProjector(idCard)).toEqual(true);
});

it("Trovare una carta non esistente", async () => {
  let idCard = v4();
  let idCardinesistente = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
  ]);

  expect(await runCardExistProjector(idCardinesistente)).toEqual(false);
});

it("Trovare una carta esistente ma adesso rimossa", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
    {
      type: EventTypeCard.GIFT_CARD_REMOVED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
      },
    },
  ]);

  expect(await runCardExistProjector(idCard)).toEqual(false);
});

it("Rimuovere una carta non esistente", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: CommandTypeCard.REMOVE_GIFT_CARD,
      stream_name: "giftCard:command-" + idCard,
      data: {
        id: idCard,
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let event = testUtils.getStreamMessages("giftCard");
    expect(event).toHaveLength(1);
    expect(event[0].type).toEqual(EventTypeCard.GIFT_CARD_ERROR);
    expect(event[0].data.type).toEqual("CardNotExist");
  });
});

it("Rimuovere una carta", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
    {
      type: CommandTypeCard.REMOVE_GIFT_CARD,
      stream_name: "giftCard:command-" + idCard,
      data: {
        id: idCard,
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let event = testUtils.getStreamMessages("giftCard");
    expect(event).toHaveLength(2);
    expect(event[1].type).toEqual(EventTypeCard.GIFT_CARD_REMOVED);
    expect(event[1].data.id).toEqual(idCard);
  });
});

it("Update di una carta", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
    {
      type: CommandTypeCard.UPDATE_GIFT_CARD,
      stream_name: "giftCard:command-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frullatore",
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let event = testUtils.getStreamMessages("giftCard");
    expect(event).toHaveLength(2);
    expect(event[1].type).toEqual(EventTypeCard.GIFT_CARD_UPDATED);
    expect(event[1].data.id).toEqual(idCard);
  });
});

it("Update di una carta che non esiste", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: CommandTypeCard.UPDATE_GIFT_CARD,
      stream_name: "giftCard:command-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frullatore",
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let event = testUtils.getStreamMessages("giftCard");
    expect(event).toHaveLength(1);
    expect(event[0].type).toEqual(EventTypeCard.GIFT_CARD_ERROR);
    expect(event[0].data.type).toEqual("CardNotExist");
  });
});

it("Verifica se un taglio esiste", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
  ]);

  expect(await runVerifyAmountProjector(idCard, 10)).toEqual(true);
});

it("Verifica se un taglio non esiste", async () => {
  let idCard = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
  ]);

  expect(await runVerifyAmountProjector(idCard, 12)).toEqual(false);
});

it("Usare una carta avendo tutto in regola", async () => {
  let idCard = v4();
  let idTrans = v4();
  let idAccount1 = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amountCredit: 1000,
      },
    },
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
    {
      type: CommandTypeCard.REDEEM_GIFT_CARD,
      stream_name: "giftCardTransaction:command-" + idTrans,
      data: {
        transactionId: idTrans,
        idCard: idCard,
        userId: idAccount1,
        amount: 50,
      },
    },
    {
      type: EventTypeCredit.CREDITS_USED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amountCredit: 50,
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let eventG = testUtils.getStreamMessages("giftCard");
    let eventT = testUtils.getStreamMessages("giftCardTransaction");
    expect(eventG).toHaveLength(1);
    expect(eventT).toHaveLength(2);
    expect(eventG[0].type).toEqual(EventTypeCard.GIFT_CARD_ADDED);
    expect(eventT[0].type).toEqual(EventTypeCard.GIFT_CARD_REDEEM_PENDING);
    expect(eventT[1].type).toEqual(EventTypeCard.GIFT_CARD_REDEEM_PROCESSING);
  });
});

it("Usare una carta avendo un amount non pervenuto", async () => {
  let idCard = v4();
  let idAccount1 = v4();
  let idTrans = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCredit.CREDITS_EARNED,
      stream_name: "creditAccount-" + idAccount1,
      data: {
        id: idAccount1,
        amountCredit: 1000,
      },
    },
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
    {
      type: CommandTypeCard.REDEEM_GIFT_CARD,
      stream_name: "giftCardTransaction:command-" + idCard,
      data: {
        id: idCard,
        userId: idAccount1,
        amount: 55,
        transactionId: idTrans,
      },
    },
  ]);

  await testUtils.expectIdempotency(runGiftCard, () => {
    let eventG = testUtils.getStreamMessages("giftCard");
    let eventT = testUtils.getStreamMessages("giftCardTransaction");
    expect(eventG).toHaveLength(1);
    expect(eventT).toHaveLength(2);
    expect(eventG[0].type).toEqual(EventTypeCard.GIFT_CARD_ADDED);
    expect(eventT[0].type).toEqual(EventTypeCard.GIFT_CARD_REDEEM_PENDING);
    expect(eventT[1].type).toEqual(EventTypeCard.GIFT_CARD_REDEEM_FAILED);
  });
});

it("Ritorna false se non è in pending", async () => {
  let idCard = v4();
  let idTrans = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
  ]);

  expect(await runVerifyPendingProjector(idTrans)).toEqual(false);
});

it("Ritorna true se è in pending", async () => {
  let idTrans = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_REDEEM_PENDING,
      stream_name: "giftCardTransaction-" + idTrans,
      data: {},
    },
  ]);

  expect(await runVerifyPendingProjector(idTrans)).toEqual(true);
});

it("Ritorna false se non è in Processing", async () => {
  let idCard = v4();
  let idTrans = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_ADDED,
      stream_name: "giftCard-" + idCard,
      data: {
        id: idCard,
        name: "Amazon",
        description: "Carta per comprarti il frigo",
        image_url: "https://img.it",
        amounts: [5, 10, 20, 30, 50],
      },
    },
    {
      type: EventTypeCard.GIFT_CARD_REDEEM_PENDING,
      stream_name: "giftCardTransaction-" + idTrans,
      data: {
        id: idTrans,
      },
    },
  ]);

  expect(await runVerifyProcessingProjector(idTrans)).toEqual(false);
});

it("Ritorna true se è in Processing", async () => {
  let idTrans = v4();
  testUtils.setupMessageStore([
    {
      type: EventTypeCard.GIFT_CARD_REDEEM_PROCESSING,
      stream_name: "giftCardTransaction-" + idTrans,
      data: { id: idTrans },
    },
  ]);

  expect(await runVerifyProcessingProjector(idTrans)).toEqual(true);
});
