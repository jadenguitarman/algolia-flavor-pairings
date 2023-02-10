import algoliarecommend from '@algolia/recommend';
import { useFrequentlyBoughtTogether } from '@algolia/recommend-react';
import { createAlgoliaInsightsPlugin } from '@algolia/autocomplete-plugin-algolia-insights';
import algoliasearch from 'algoliasearch';
import insights from 'search-insights';
import {
	autocomplete,
	getAlgoliaResults
} from '@algolia/autocomplete-js';

import React, {
	createElement,
	Fragment,
	ReactElement,
	useEffect,
	useRef,
	useState
} from 'react';
import { render } from 'react-dom';

import '@algolia/autocomplete-theme-classic';
import '@algolia/ui-components-horizontal-slider-theme';
import './App.css';

import {
	appId,
	apiKey,
	indexName
} from './config.js';

const searchClient = algoliasearch(appId, apiKey);
const recommendClient = algoliarecommend(appId, apiKey);
insights('init', { appId, apiKey, useCookie: true });
const algoliaInsightsPlugin = createAlgoliaInsightsPlugin({ insightsClient: insights });

const IngredientSuggestions = ({ currentObjectID, name }) => {
	const { recommendations, queryID } = useFrequentlyBoughtTogether({
		recommendClient,
		indexName,
		objectIDs: [currentObjectID],
		maxRecommendations: 3,
		queryParameters: {
			analytics: true,
			clickAnalytics: true
		}
	});

	return (
		<>
			<h1 id="heading">What flavors pair well with {name}?</h1>
			{recommendations.length != 0
				? (
					<div id="usedWith">
						{recommendations.map(({name, image, objectID}) =>
							<div className="result" key={objectID}>
								<img src={image} />
								<span>{name}</span>
								<div
									title="I like this combo"
									onClick={e => {
										e.target.classList.add("liked");
										insights(
											'convertedObjectIDsAfterSearch',
											{
												eventName: 'Pairing Liked',
												index: indexName,
												objectIDs: [currentObjectID, objectID],
												queryID
											}
										);
									}}
								>👍</div>
							</div>
						)}
					</div>
				)
				: (
					<p>We don't have any data on this.</p>
				)
			}
		</>
	)
};

const App = () => {
	const [selectedResult, setSelectedResult] = useState(null);
	const autocompleteContainerRef = useRef(null);

	useEffect(() => {
		if (!autocompleteContainerRef.current) return undefined;

		const search = autocomplete({
			container: autocompleteContainerRef.current,
			renderer: { createElement, Fragment },
			render({ children }, root) {
				render(children as ReactElement, root);
			},
			placeholder: "Search for an ingredient",
			plugins: [algoliaInsightsPlugin],
			openOnFocus: true,
			defaultActiveItemId: 0,
			getSources: ({ query }) => [
				{
					sourceId: 'suggestions',
					getItems: () => getAlgoliaResults({
						searchClient,
						queries: [
							{
								indexName,
								query,
								params: {
									hitsPerPage: 12,
									clickAnalytics: true
								}
							}
						]
					}),
					getItemInputValue: ({ item }) => item.name,
					onSelect: ({ item }) => {
						setSelectedResult({
							objectID: item.objectID,
							name: item.name,
							image: item.image
						});
					},
					templates: {
						item({ item, components, state, html }) {
							return createProductItemTemplate({
								hit: item,
								components,
								insights: state.context.algoliaInsightsPlugin.insights,
								html
							});
						},
						item: ({ item, ...params }) => (
							<div className="result autocompleteSuggestion">
								<img src={item.image} />
								<span>{item.name}</span>
							</div>
						)
					}
				}
			]
		});

		console.log(search)

		return () => {
			search.destroy();
		};
	}, []);

	return (
		<>
			<p id="intro">Welcome to the flavor pairing database! Search for flavors below.</p>

			<div ref={autocompleteContainerRef} />

			{selectedResult ? (
				<IngredientSuggestions
					currentObjectID={selectedResult.objectID}
					name={selectedResult.name}
				/>
			) : (
				<p id="getStarted">Start typing in the name of an ingredient to see what other ingredients are commonly used with it!</p>
			)}
		</>
	);
};

export default App;
