"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphqlExpress = require("express-graphql");
const graphql_tools_1 = require("graphql-tools");
const graphql_service_1 = require("../services/graphql.service");
const common_1 = require("./types/common");
const user_type_1 = require("./types/user.type");
const schema_1 = require("./schema");
const directives_1 = require("./directives");
// import {} from './types/authentication.type';
async function getGraphqlHandler() {
    const typeDefs = await graphql_service_1.loadTypeSystem();
    const schema = graphql_tools_1.makeExecutableSchema({
        typeDefs,
        directiveResolvers: directives_1.directiveResolvers,
        resolvers: [user_type_1.resolvers, schema_1.resolvers, directives_1.resolvers],
        schemaDirectives: { ...common_1.schemaDirectives, ...user_type_1.schemaDirectives },
    });
    return (serveGraphiql = false) => graphqlExpress((req, res) => ({
        schema,
        context: {
            req,
            res,
        },
        graphiql: serveGraphiql,
        pretty: true,
    }));
}
exports.getGraphqlHandler = getGraphqlHandler;
//# sourceMappingURL=index.js.map