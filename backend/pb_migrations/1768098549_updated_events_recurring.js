/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_1687431684");

    // Remove unique index on title to allow recurring events with same name
    collection.indexes = collection.indexes.filter(
      (index) => !index.includes("idx_4dL89HCxNF"),
    );

    // Add series_id field to group recurring events
    collection.fields.addAt(
      10,
      new Field({
        autogeneratePattern: "",
        hidden: false,
        id: "text_series_id",
        max: 0,
        min: 0,
        name: "series_id",
        pattern: "",
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: "text",
      }),
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_1687431684");

    // Restore unique index on title
    collection.indexes = [
      ...collection.indexes,
      "CREATE UNIQUE INDEX `idx_4dL89HCxNF` ON `events` (`title`)",
    ];

    // Remove series_id field
    collection.fields.removeById("text_series_id");

    return app.save(collection);
  },
);
