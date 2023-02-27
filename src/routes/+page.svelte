<script lang="ts">
	import type { CreateCompletionRequest } from 'openai';
	import { SSE } from 'sse.js';
	import { flip } from 'svelte/animate';
	import { crossfade, fade } from 'svelte/transition';
	import { backInOut, elasticIn, elasticInOut, quintIn, quintOut, sineIn } from 'svelte/easing';

	const [send, receive] = crossfade({
		fallback(node, params) {
			const style = getComputedStyle(node);
			const transform = style.transform === 'none' ? '' : style.transform;
			return {
				duration: 600,
				easing: sineIn,
				css: (t, u) => `
					transform: ${transform} translateX(${u * 600}px) scale(${t});
					opacity: ${t};
				`
			};
		}
	});

	let loading: boolean;
	let error: boolean;
	let context: string = '';
	let answer: string = '';
	let uid: number = 0;
	let answers: Array<{ id: number; question: string; text: string; seen: boolean }> = [];

	const handleSubmit = async () => {
		loading = true;
		error = false;

		if (answers.length > 0) {
			console.log(answers);
			answers[uid - 1].seen = true;
			answer = '';
		}

		const eventSource = new SSE('/api/answer', {
			headers: {
				'Content-Type': 'application/json'
			},
			payload: JSON.stringify({ context })
		});

		eventSource.addEventListener('error', (e) => {
			error = true;
			loading = false;
			alert('Something went wrong!');
		});

		eventSource.addEventListener('message', (e) => {
			try {
				loading = false;

				if (e.data === '[DONE]') {
					answers = [...answers, { id: uid++, question: context, text: answer, seen: false }];
					context = '';
					return;
				}

				const completionResponse: CreateCompletionRequest = JSON.parse(e.data);

				const [{ text }] = completionResponse.choices;

				answer = (answer ?? '') + text;
			} catch (err) {
				error = true;
				loading = false;
				console.log(err);
				alert('Something went wrong!');
			}
		});

		eventSource.stream();
	};
</script>

<div class="fixed text-left top-20 ml-2" style:max-width="250px">
	<h5 class="ml-2">History</h5>
	{#if answers}
		<ol class="flex flex-col">
			{#each answers.filter((x) => x.seen === true) as answer (answer.id)}
				<li class="m-2" in:receive={{ key: answer.id }} out:send={{ key: answer.id }} animate:flip>
					<p style="font-size: .75em;">{answer.id + 1}. {answer.question}</p>
					<p style="font-size: .75em;">{answer.text}</p>
				</li>
			{/each}
		</ol>
	{/if}
</div>
<div class="container h-full mx-auto flex justify-center items-center w-6/12">
	<div class="space-y-10 text-center w-full">
		<h2 class="font-bold">I'm A-Hole Andy...ask me anything.</h2>
		<form on:submit|preventDefault={handleSubmit} class="w-full">
			<label class="label text-left">
				<span>Question</span>
				<textarea
					class="textarea w-full"
					name="context"
					bind:value={context}
					placeholder="Type your question here..."
				/>
			</label>
			<button class="btn variant-ghost-primary mt-4">Go</button>
		</form>
		<div class="pt-4 w-full">
			<p class="text-left">Answer:</p>
			{#if answers.length > 0}
				{#each answers.filter((x) => x.seen === false) as answer (answer.id)}
					<p class="text-left" in:receive={{ key: answer.id }} out:send={{ key: answer.id }}>
						{answer.text}
					</p>
				{/each}
			{/if}
		</div>
	</div>
</div>

<style lang="postcss">
	figure {
		@apply flex relative flex-col;
	}
	figure svg,
	.img-bg {
		@apply w-64 h-64 md:w-80 md:h-80;
	}
	.img-bg {
		@apply absolute z-[-1] rounded-full blur-[50px] transition-all;
		animation: pulse 5s cubic-bezier(0, 0, 0, 0.5) infinite, glow 5s linear infinite;
	}
	@keyframes glow {
		0% {
			@apply bg-primary-400/50;
		}
		33% {
			@apply bg-secondary-400/50;
		}
		66% {
			@apply bg-tertiary-400/50;
		}
		100% {
			@apply bg-primary-400/50;
		}
	}
	@keyframes pulse {
		50% {
			transform: scale(1.5);
		}
	}
</style>
