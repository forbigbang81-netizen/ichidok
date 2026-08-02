import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    url: "file:/home/z/my-project/db/custom.db",
  },
});
