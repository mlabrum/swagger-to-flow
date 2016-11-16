#!/usr/bin/env node
const fetch = require('node-fetch')
const swaggerToFlowTypes = require('./lib/swagger_to_flow_types')

if(!Object.entries) {
	require('object.entries').shim()
}

const argv = require('yargs')
	.usage('Usage: $0 --url url_of_swagger.json')
	.describe('url', 'URL for the swagger json file')
	.describe('transformProperty', 'transforms a property name')
	.choices('transformProperty', ['normal', 'firstCaseLower'])
	.default('transformProperty', 'normal')
	.demand(['url'])
	.argv;


fetch(argv.url)
	.then((response) => response.json())
	.then((json) => {
		let data = []
		if(json.definitions){
			for(let [key, value] of Object.entries(json.definitions)){
				data.push(`export type ${key} = ${processDefinition(key, value)}`)
			}

			console.log(data.join('\n\n'))

		}else{
			throw new Error('No swagger definitions to parse')
		}
	})
	.catch(e => {
		console.error(e.message)
	})


/**
 * Process the individual definition
 * @param name
 * @param data
 * @return {string}
 */
function processDefinition(name, data){
	if(data.type == 'object') {
		return `{\n\t${Object.entries(data.properties).map(([key, value]) => `${parsePropertyName(key)}: ${parsePropertyType(value)}`).join(',\n\t')}\n}`
	}else{
		throw new Error(`Unable to parse ${data.type} for ${name}`)
	}
}

/**
 * Process the raw type
 * @param type
 * @return {string}
 */
function parsePropertyType(type){
	if(type.type == 'array'){
		if(type.items.type){
			return `Array<${swaggerToFlowTypes[type.items.type]}>`
		}else if(type.items['$ref']) {
			return `Array<${type.items['$ref'].replace('#/definitions/', '')}>`
		}
	}else{
		return swaggerToFlowTypes[type.type]
	}
}

/**
 * Transform the property name if required
 * @param name
 * @return {string}
 */
function parsePropertyName(name){
	switch(argv.transformProperty){
		case 'firstCaseLower':
			return name.charAt(0).toLowerCase() + name.slice(1)
	}

	return name
}
