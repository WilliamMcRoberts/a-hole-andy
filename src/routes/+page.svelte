<script lang="ts">
	import type { CreateCompletionRequest } from 'openai';
	import { SSE } from 'sse.js';

	let loading: boolean;
	let error: boolean;
	let context: string = '';
	let answer: string = '';
	let uid: number = 0;
	let answers: Array<{ id: number; question: string; text: string }> = [];
	let oldAnswers: Array<{ id: number; question: string; text: string }> = [];

	const handleSubmit = async () => {
		loading = true;
		error = false;

		if (answers.length > 0) {
			oldAnswers = [answers[0], ...oldAnswers];
			answers = answers.filter((x) => x.id !== uid);
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
					answers = [{ id: uid++, question: context, text: answer }, ...answers];
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

<div class="fixed text-left top-20 ml-4" style:max-width="300px">
	<h5 class="ml-2">History</h5>
	{#if answers}
		<ol class="flex flex-col">
			{#each oldAnswers.reverse() as oldAnswer (oldAnswer.id)}
				<li class="m-2">
					<p style="font-size: .75em;">{oldAnswer.id + 1}. {oldAnswer.question}</p>
					<p style="font-size: .75em;">{oldAnswer.text}</p>
				</li>
			{/each}
		</ol>
	{/if}
</div>
<div class="container h-full mx-auto flex justify-center items-center w-3/4">
	<div class="space-y-10 text-center">
		<h2 class="font-bold">I'm A-Hole Andy...ask me anything.</h2>
		<form on:submit|preventDefault={handleSubmit} class="w-full">
			<label class="label text-left">
				<span>Question</span>
				<textarea
					class="textarea"
					name="context"
					bind:value={context}
					placeholder="Type your question here..."
				/>
			</label>
			<button class="btn variant-ghost-primary mt-4">Go</button>
			<div class="pt-4" style="max-width: 700px;">
				<h3>Answer:</h3>
				{#if answer}
					<p>{answer}</p>
				{/if}
			</div>
		</form>
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
