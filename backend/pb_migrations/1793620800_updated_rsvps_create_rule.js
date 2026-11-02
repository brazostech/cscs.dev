/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_rsvps");

    // A signed-in user may only create an RSVP for themselves. The previous
    // rule accepted any authenticated request, so user A could POST an RSVP
    // with user = B and RSVP on B's behalf.
    collection.createRule =
      '@request.auth.id != "" && @request.body.user = @request.auth.id';

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_rsvps");

    collection.createRule = '@request.auth.id != ""';

    return app.save(collection);
  },
);
