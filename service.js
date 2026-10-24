const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const { v4: uuidv4 } = require('uuid');

const CONFIG = path.join(
    __dirname,
    process.argv[2] || 'config.yaml'
);

let config;

try {
    config = yaml.load(fs.readFileSync(CONFIG, 'utf8'));
} catch (error) {
    console.error('Error reading or parsing config:', error);
    process.exit(1);
}

function getRoutes() {
    return config.routes;
}

function getAll(route) {
    return config[route] || [];
}

function getById(route, id) {
    const data = getAll(route);
    return data.find(record => record.id === id);
}

function getEmbeddedRecords(route, record, embed) {
    const relationships = config.relationships?.[route] || [];

    const relationship = relationships.find(
        rel => rel.relatedRoute === embed
    );

    if (!relationship) {
        return [];
    }

    const foreignKeys = record[relationship.foreignKey];

    if (!Array.isArray(foreignKeys)) {
        return [];
    }

    const embedData = getAll(embed);

    return embedData.filter(item => foreignKeys.includes(item.id));
}

function create(route, newRecord) {
    const data = getAll(route);

    if (newRecord.id === undefined) {
        newRecord.id = uuidv4();
    }

    data.push(newRecord);
    config[route] = data;

    return newRecord;
}

function update(route, id, updatedRecord) {
    const data = getAll(route);
    const index = data.findIndex(record => record.id === id);

    if (index === -1) {
        return null;
    }

    updatedRecord.id = data[index].id;
    data[index] = updatedRecord;
    config[route] = data;

    return updatedRecord;
}

function remove(route, id) {
    const data = getAll(route);
    const index = data.findIndex(record => record.id === id);

    if (index === -1) {
        return null;
    }

    const deletedRecord = data.splice(index, 1)[0];
    config[route] = data;

    return deletedRecord;
}

function saveConfig() {
    try {
        const yamlContent = yaml.dump(config);
        fs.writeFileSync(CONFIG, yamlContent, 'utf8');

        console.log('Configuration saved successfully.');
    } catch (error) {
        console.error('Error saving configuration:', error);
        throw error;
    }
}

module.exports = {
    getRoutes,
    getAll,
    getById,
    getEmbeddedRecords,
    create,
    update,
    remove,
    saveConfig
};