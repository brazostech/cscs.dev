/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = new Collection({
      id: "pbc_rsvps",
      name: "rsvps",
      type: "base",
      system: false,
      fields: [
        {
          autogeneratePattern: "[a-z0-9]{15}",
          hidden: false,
          id: "text3208210256",
          max: 15,
          min: 15,
          name: "id",
          pattern: "^[a-z0-9]+$",
          presentable: false,
          primaryKey: true,
          required: true,
          system: true,
          type: "text",
        },
        {
          cascadeDelete: true,
          collectionId: "pbc_1687431684",
          hidden: false,
          id: "relation_event",
          maxSelect: 1,
          minSelect: 1,
          name: "event",
          presentable: false,
          required: true,
          system: false,
          type: "relation",
        },
        {
          cascadeDelete: true,
          collectionId: "_pb_users_auth_",
          hidden: false,
          id: "relation_user",
          maxSelect: 1,
          minSelect: 1,
          name: "user",
          presentable: false,
          required: true,
          system: false,
          type: "relation",
        },
        {
          hidden: false,
          id: "autodate_created",
          name: "created",
          onCreate: true,
          onUpdate: false,
          presentable: false,
          system: false,
          type: "autodate",
        },
        {
          hidden: false,
          id: "autodate_updated",
          name: "updated",
          onCreate: true,
          onUpdate: true,
          presentable: false,
          system: false,
          type: "autodate",
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX `idx_rsvp_event_user` ON `rsvps` (`event`, `user`)",
      ],
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: null,
      deleteRule: "user = @request.auth.id",
    });

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_rsvps");
    return app.delete(collection);
  },
);
