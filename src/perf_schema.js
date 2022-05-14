export default ({

    "$defs": {
        graft: {
            type: "object",
            properties: {
                type: {type: "string"},
                nBlocks: {type: "integer"},
                firstBlockScope: {type: "string"},
                previewText: {type: "string"},
                selected: {type: "boolean"},
                blocks: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            type: {type: "string"},
                            subType: {type: "string"},
                            target: {type: "string"},
                        },
                        required: ["type", "subType", "target"],
                        additionalProperties: false,
                    },
                },
            },
            required: [
                "type",
                "nBlocks",
                "firstBlockScope",
                "previewText",
                "selected",
            ],
            additionalProperties: false,
        },
        block: {
            type: "object",
            properties: {
                type: {type: "string"},
                nBlocks: {type: "integer"},
                firstBlockScope: {type: "string"},
                previewText: {type: "string"},
                selected: {type: "boolean"},
                blocks: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            type: {type: "string"},
                            subType: {type: "string"},
                            target: {type: "string"},
                        },
                        required: ["type", "subType", "target"],
                        additionalProperties: false,
                    },
                },
            },
            required: [
                "type",
                "nBlocks",
                "firstBlockScope",
                "previewText",
                "selected",
            ],
            additionalProperties: false,
        },

    },
    type: "object",
    properties: {
        docSets: {
            type: "object",
            propertyNames: {
                pattern: "^\\S+$",
            },
            additionalProperties: {
                type: "object",
                properties: {
                    selectors: {
                        type: "object",
                        minProperties: 1,
                        maxProperties: 6,
                        propertyNames: {
                            pattern: "^\\S+$",
                        },
                        additionalProperties: {
                            type: "string",
                        },
                    },
                    tags: {
                        type: "array",
                        items: {
                            type: "string",
                        }
                    },
                    documents: {
                        type: "object",
                        propertyNames: {
                            pattern: "^[A-Z0-9]{3}$",
                        },
                        additionalProperties: {
                            type: "object",
                            properties: {
                                headers: {
                                    type: "object",
                                    propertyNames: {
                                        pattern: "^\\S+$",
                                    },
                                    additionalProperties: {
                                        type: "string",
                                    },
                                },
                                tags: {
                                    type: "array",
                                    items: {
                                        type: "string",
                                    },
                                },
                                sequences: {
                                    type: "object",
                                    propertyNames: {
                                        pattern: "^\\S+$",
                                    },
                                    additionalProperties: {
                                        type: "object",
                                        oneOf: [
                                            {"$ref": "#/$defs/graft"}
                                        ],
                                    },
                                },
                                mainSequence: {type: "string"},
                            },
                            required: ["headers", "tags", "sequences", "mainSequence"],
                        },
                    }
                },
                required: ["selectors", "tags", "documents"],
            },
        },
    },
    required: ['docSets'],
    additionalProperties: false,
});
