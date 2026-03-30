/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("_pb_users_auth_");

    // update collection data
    unmarshal(
      {
        createRule:
          "@request.body.email:isset = true && @request.body.password:isset = true && (@request.body.role:isset = false || @request.body.role = 'user')",
        updateRule:
          "id = @request.auth.id && (@request.body.role:isset = false || @request.body.role = role)",
      },
      collection,
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("_pb_users_auth_");

    // update collection data
    unmarshal(
      {
        createRule: "",
        updateRule: "id = @request.auth.id",
      },
      collection,
    );

    return app.save(collection);
  },
);
