/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_1687431684");

    collection.fields.addAt(
      11,
      new Field({
        cascadeDelete: false,
        collectionId: "pbc_books",
        hidden: false,
        id: "relation_book",
        maxSelect: 1,
        minSelect: 0,
        name: "book",
        presentable: false,
        required: false,
        system: false,
        type: "relation",
      }),
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_1687431684");
    collection.fields.removeById("relation_book");
    return app.save(collection);
  },
);
