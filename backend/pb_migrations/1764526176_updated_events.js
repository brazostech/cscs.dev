/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_1687431684");

    // remove field
    collection.fields.removeById("date2482226890");

    // remove field
    collection.fields.removeById("geoPoint1587448267");

    // add field
    collection.fields.addAt(
      4,
      new Field({
        autogeneratePattern: "",
        hidden: false,
        id: "text2363381545",
        max: 0,
        min: 0,
        name: "type",
        pattern: "",
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: "text",
      }),
    );

    // add field
    collection.fields.addAt(
      5,
      new Field({
        autogeneratePattern: "",
        hidden: false,
        id: "text1587448267",
        max: 0,
        min: 0,
        name: "location",
        pattern: "",
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: "text",
      }),
    );

    // add field
    collection.fields.addAt(
      6,
      new Field({
        autogeneratePattern: "",
        hidden: false,
        id: "text2623739950",
        max: 0,
        min: 0,
        name: "location_details",
        pattern: "",
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: "text",
      }),
    );

    // add field
    collection.fields.addAt(
      7,
      new Field({
        autogeneratePattern: "",
        hidden: false,
        id: "text223791402",
        max: 0,
        min: 0,
        name: "time_zone",
        pattern: "",
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: "text",
      }),
    );

    // add field
    collection.fields.addAt(
      8,
      new Field({
        autogeneratePattern: "",
        hidden: false,
        id: "text2862495610",
        max: 0,
        min: 0,
        name: "date",
        pattern: "",
        presentable: false,
        primaryKey: false,
        required: false,
        system: false,
        type: "text",
      }),
    );

    // add field
    collection.fields.addAt(
      9,
      new Field({
        autogeneratePattern: "",
        hidden: false,
        id: "text1872009285",
        max: 0,
        min: 0,
        name: "time",
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

    // add field
    collection.fields.addAt(
      2,
      new Field({
        hidden: false,
        id: "date2482226890",
        max: "",
        min: "",
        name: "datetime",
        presentable: false,
        required: false,
        system: false,
        type: "date",
      }),
    );

    // add field
    collection.fields.addAt(
      3,
      new Field({
        hidden: false,
        id: "geoPoint1587448267",
        name: "location",
        presentable: false,
        required: false,
        system: false,
        type: "geoPoint",
      }),
    );

    // remove field
    collection.fields.removeById("text2363381545");

    // remove field
    collection.fields.removeById("text1587448267");

    // remove field
    collection.fields.removeById("text2623739950");

    // remove field
    collection.fields.removeById("text223791402");

    // remove field
    collection.fields.removeById("text2862495610");

    // remove field
    collection.fields.removeById("text1872009285");

    return app.save(collection);
  },
);
