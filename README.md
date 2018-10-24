## Features developed by Facundo Palavecino

### Integration between both scripts (WebAdaptation & ResponsivePage) and a repository (AugmentationCatalog) capable of store augmentations made by users.

There are 2 new features in the scripts, which allow them to interact with the repository available here:
- https://github.com/Olorapino/AugmentationCatalog

### WebAdaptation

- Store configuration in the catalog: The extension sends the configuration made by the user to the catalog via HttpRequest (POST).
- Fetch configuration from the catalog: The extension gets a configuration from the catalog via HttpRequest (GET). 

When fetching, it may happen that:
- There are no configurations stored for a given page (user is notified).
- There is 1 configuration stored for a given page (configuration is fetched and loaded).
- There are more than 1 configuration stored (user has to choose between the posibilities so a configuration is loaded).

All these posibilities are handled by the script in order to provide the user a friendly experience.

- Set Catalog URL: User must provide the catalog's URL to the script before trying to store/fetch data.
- Delete Catalog URL: The script resets the catalog's base url to the default value (blank).

### ResponsivePage

- Fetch configuration from the catalog: The extension gets a configuration from the catalog via promises.

User is notified whether there is none, 1 or more than 1 configuration available.

Further information about data flow between scripts & catalog available here:
- https://github.com/Olorapino/AugmentationCatalog
