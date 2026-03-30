/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_1687431684");

    // update collection data
    unmarshal(
      {
        createRule:
          '@request.auth.id != "" && @request.auth.role = "moderator"',
        deleteRule:
          '@request.auth.id != "" && @request.auth.role = "moderator"',
        listRule: "",
        updateRule:
          '@request.auth.id != "" && @request.auth.role = "moderator"',
        viewRule: "",
      },
      collection,
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_1687431684");

    // update collection data
    unmarshal(
      {
        createRule: null,
        deleteRule: null,
        listRule: null,
        updateRule: null,
        viewRule: null,
      },
      collection,
    );

    return app.save(collection);
  },
);
