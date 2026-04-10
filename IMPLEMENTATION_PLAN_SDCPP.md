# IMPLEMENTATION_PLAN_SDCPP.md

## Objective

Turn this repository into a WebUI and API bridge for `stable-diffusion.cpp`, while preserving the current architecture:

- React frontend in `apps/web`
- Hono API in `apps/api`
- OpenAI-style endpoints under `/v1/*`
- provider/channel abstraction for backend integrations

The goal is to support both:

1. **Local inference**: the UI/API and `stable-diffusion.cpp` server run on the same machine
2. **Remote inference**: the UI/API runs on one machine and forwards requests to a remote `stable-diffusion.cpp` server over LAN, Tailscale, or a private reverse proxy

---

## Non-Goals for v1

The first implementation should **not** attempt to solve all advanced image workflow use cases.

Out of scope for the initial milestone:

- graph-based workflow editing
- ControlNet
- LoRA management UI
- distributed scheduler / worker queue
- object storage backend
- multi-user job accounting
- full feature parity with every upstream `stable-diffusion.cpp` option

The initial version should focus on:

- text-to-image
- basic generation controls
- local and remote backend support
- stable image serving URLs
- minimal frontend changes

---

## Recommended Architecture

### Keep the existing app structure

Do **not** rewrite the frontend.

Do **not** directly connect the browser to `stable-diffusion.cpp`.

Instead, add `stable-diffusion.cpp` as a new backend channel inside the existing API layer.

### Request flow

```text
Browser UI
  -> apps/web
  -> apps/api (/v1/images/generations)
  -> new sdcpp provider channel
  -> stable-diffusion.cpp HTTP server
```

This preserves:

- the existing OpenAI-format contract
- the current provider selection model
- future compatibility with multiple backends
- safer remote access patterns

---

## Operating Modes

### Mode A: Local same-machine

Example:

- `apps/web` on `http://127.0.0.1:5173`
- `apps/api` on `http://127.0.0.1:8787`
- `stable-diffusion.cpp` server on `http://127.0.0.1:8080`

Use case:

- single-machine GPU workstation
- local development on Linux desktop

### Mode B: Local UI/API, remote inference backend

Example:

- frontend/backend on laptop or VPS
- `stable-diffusion.cpp` on GPU machine over Tailscale or LAN
- API forwards requests to `http://100.x.x.x:8080`

Use case:

- thin client UI
- dedicated GPU node

### Mode C: Public UI, private inference node

Example:

- public app on VPS
- `stable-diffusion.cpp` reachable only over Tailscale/private overlay
- browser never talks directly to inference host

Use case:

- public or semi-public app deployment
- better backend protection

---

## High-Level Design

Add a new provider/channel named `sdcpp`.

### Proposed provider identifier

- `sdcpp`

### Example model ids

- `sdcpp/default`
- `sdcpp/sd15`
- `sdcpp/sdxl`
- `sdcpp/flux-dev`

These model ids are application-level presets. They do not need to map one-to-one with upstream model files yet.

---

## Required Code Areas

### API side

Likely files to add:

- `apps/api/src/channels/sdcpp.ts`
- `apps/api/src/core/sdcpp-client.ts`
- `apps/api/src/core/sdcpp-types.ts`
- `apps/api/src/core/image-storage.ts`

Likely files to update:

- `apps/api/src/channels/index.ts`
- `apps/api/src/config.ts`
- `apps/api/src/app.ts`
- `apps/api/src/openai/routes.ts` if extra request fields need passthrough
- shared model/provider definitions in `packages/*`

### Web side

Likely files to update:

- provider selector data source
- model selector data source
- advanced generation settings components
- optional labels/help text for `stable-diffusion.cpp`

---

## Environment and Configuration

Add environment variables for local and remote routing.

### Minimum environment variables

```env
SDCPP_BASE_URL=http://127.0.0.1:8080
SDCPP_API_KEY=
SDCPP_TIMEOUT_MS=180000
SDCPP_DEFAULT_MODEL=sdcpp/default
SDCPP_REMOTE_ENABLED=true
SDCPP_OUTPUT_DIR=./data/generated
SDCPP_PUBLIC_BASE_URL=http://localhost:8787
SDCPP_FILE_TTL_HOURS=24
```

### Optional environment variables

```env
SDCPP_BASIC_AUTH_USER=
SDCPP_BASIC_AUTH_PASS=
SDCPP_ROUTE_PREFIX=
SDCPP_ALLOW_SELF_SIGNED=false
SDCPP_NEGATIVE_PROMPT_DEFAULT=
SDCPP_SAMPLER_DEFAULT=euler
SDCPP_STEPS_DEFAULT=20
SDCPP_CFG_DEFAULT=7
SDCPP_DEFAULT_WIDTH=1024
SDCPP_DEFAULT_HEIGHT=1024
```

### Notes

- `SDCPP_BASE_URL` must be configurable so the app can target either a local or remote inference host.
- `SDCPP_PUBLIC_BASE_URL` is used when returning image URLs served by `apps/api`.
- `SDCPP_OUTPUT_DIR` should be writable by the API process.

---

## Provider Registration

### Task

Create and register a new channel file:

- `apps/api/src/channels/sdcpp.ts`

### Responsibilities

The channel must:

- declare provider id `sdcpp`
- expose image generation capability
- accept internal image requests from the OpenAI-style route layer
- translate them to `stable-diffusion.cpp` server requests
- normalize backend responses into the app's internal image result format

### Registration

Update:

- `apps/api/src/channels/index.ts`

Add:

- `import { sdcppChannel } from './sdcpp'`
- register it alongside the existing built-in channels

---

## Model Exposure Strategy

The app currently exposes models through `/v1/models`.

### v1 recommendation: static preset list

Start with a preset-based model catalog.

Recommended v1 presets:

- `sdcpp/default`
- `sdcpp/sd15`
- `sdcpp/sdxl`

Each preset can map to backend config such as:

- model alias
- default width/height
- default steps
- default CFG
- sampler preference

### Future option: dynamic backend introspection

Later, if upstream `stable-diffusion.cpp` exposes model metadata or if the app stores preset configs externally, `/v1/models` can become dynamic.

For v1, static presets reduce implementation complexity.

---

## Request Translation Layer

This is the most important part of the integration.

The current app accepts OpenAI-style image requests such as:

```json
{
  "model": "sdcpp/default",
  "prompt": "a cat in armor",
  "size": "1024x1024",
  "steps": 20,
  "n": 1,
  "response_format": "url"
}
```

The new `sdcpp` channel must translate this into the request format expected by the `stable-diffusion.cpp` server.

### Important implementation note

The exact upstream HTTP API format may vary over time. To reduce maintenance cost, isolate all `stable-diffusion.cpp` assumptions behind a dedicated client adapter.

### Recommended internal helpers

Inside the API implementation, create functions such as:

- `buildSdcppRequest(internalReq, config)`
- `callSdcpp(baseUrl, payload, auth)`
- `normalizeSdcppResponse(raw, outputMode)`

This ensures upstream API changes only affect a small part of the codebase.

### Minimum fields to support in v1

- `prompt`
- `negative_prompt` or equivalent if supported
- `width`
- `height`
- `steps`
- `cfg_scale`
- `seed`
- `sampler`
- `model` or preset id

### Size parsing

Convert OpenAI-style `size` values into explicit dimensions.

Examples:

- `1024x1024` -> `width=1024`, `height=1024`
- `768x1344` -> `width=768`, `height=1344`

### Parameter validation

Validate before sending to the backend:

- positive integer width/height
- reasonable steps range
- supported sampler names
- optional seed format
- supported model preset

---

## Response Normalization

The frontend currently expects image responses using URL references.

The backend must normalize whatever `stable-diffusion.cpp` returns into a compatible URL-based result.

### Possible upstream response forms

Depending on server mode, `stable-diffusion.cpp` may return:

- base64 image data
- binary image data
- output file path
- image URL
- list of generated outputs

### Recommended v1 behavior

Always normalize to a served local URL.

That means:

1. receive backend result
2. save the generated image into `SDCPP_OUTPUT_DIR`
3. expose that file through `apps/api`
4. return a URL in the OpenAI-style response

### Example normalized response

```json
{
  "created": 1712345678,
  "data": [
    {
      "url": "http://localhost:8787/generated/abc123.png"
    }
  ]
}
```

This makes frontend behavior consistent regardless of whether inference is local or remote.

---

## Static Image Serving

### Recommendation

Serve generated output files from `apps/api`, not directly from `stable-diffusion.cpp`.

### Why

Benefits:

- consistent URL structure
- frontend independence from backend implementation details
- easier auth and caching rules
- easier cleanup / TTL handling
- works for both local and remote inference backends

### Proposed route

- `GET /generated/:file`

### Backing storage

- `SDCPP_OUTPUT_DIR`

### File management requirements

- create output directory on startup if missing
- generate unique filenames
- avoid predictable collisions
- reject path traversal
- optionally remove expired files on startup or via periodic cleanup

---

## UI Integration

The implementation should minimize frontend churn.

### Required frontend changes

1. add a `stable-diffusion.cpp` provider option
2. add model presets under that provider
3. ensure generation requests can include the relevant advanced fields

### Recommended v1 controls

Expose at least:

- prompt
- negative prompt
- width / height or size preset
- steps
- CFG scale
- sampler
- seed

### Optional v1 simplification

If the current UI does not have all controls wired cleanly, launch with:

- prompt
- size
- steps
- seed

and add the rest in a follow-up milestone.

---

## Security and Access Model

### Local deployments

For local-only use:

- bind `stable-diffusion.cpp` to `127.0.0.1`
- no public exposure required

### Remote deployments

Do **not** expose raw inference endpoints publicly unless protected.

Recommended remote protection methods:

- Tailscale
- reverse proxy with auth
- Cloudflare Tunnel with access control
- API host to GPU host private network path only

### Preferred deployment topology

For remote inference, the safest pattern is:

- public app on VPS or internal app host
- `stable-diffusion.cpp` on private GPU node
- API host communicates privately with the GPU node
- browser never directly contacts the inference server

---

## Error Handling Requirements

The `sdcpp` provider should integrate with the app's existing error model.

### Required failure cases

Handle and normalize:

- backend connection failure
- timeout
- invalid backend response
- unsupported parameter combination
- image save failure
- missing output image
- remote host unavailable

### User-facing examples

Return clear messages such as:

- `Inference backend unreachable`
- `Generation timed out`
- `Unsupported sampler for current backend`
- `Configured model preset not found`
- `Generated image could not be saved`

---

## Suggested Internal Types

Standardize internally on a provider-neutral request/result shape.

### Internal request

```ts
export type InternalImageRequest = {
  model?: string
  prompt: string
  negativePrompt?: string
  width: number
  height: number
  steps?: number
  cfgScale?: number
  seed?: number
  sampler?: string
}
```

### Internal result

```ts
export type InternalImageResult = {
  url: string
  revisedPrompt?: string
  metadata?: Record<string, unknown>
}
```

These types should be used between the route layer and the `sdcpp` adapter.

---

## Milestone Plan

### Milestone 1: MVP text-to-image

Deliver a working `stable-diffusion.cpp` backend integration with minimal frontend changes.

#### Tasks

- add `sdcpp` channel
- add config/env loading
- add one static model preset: `sdcpp/default`
- map prompt + size + steps + seed
- send request to local or remote backend
- save generated output to local API-served directory
- serve images under `/generated/*`
- return OpenAI-style URL response

#### Success criteria

- user can select `stable-diffusion.cpp`
- user can submit prompt
- image is generated and displayed in existing UI
- works with a local backend URL

---

### Milestone 2: Useful generation controls

Add missing core controls needed for practical use.

#### Tasks

- negative prompt
- CFG scale
- sampler selection
- more preset models
- better error messages
- remote backend testing

#### Success criteria

- local and remote backends both work
- common generation controls are exposed in UI
- failures are understandable to the user

---

### Milestone 3: Better backend ergonomics

Improve reliability and maintenance.

#### Tasks

- startup output-dir initialization
- cleanup of expired generated files
- health check for backend availability
- backend capability detection where feasible
- better request/response logging

#### Success criteria

- app recovers gracefully from missing directories
- temporary files do not grow forever
- backend failures are easier to diagnose

---

### Milestone 4: Advanced image workflows

Optional follow-up after core text-to-image is stable.

#### Possible tasks

- img2img
- image upload input
- upscaling
- queue/progress handling
- multiple backend profiles
- backend selection per request

---

## Testing Plan

### Unit tests

Add tests for:

- `size` parsing
- preset resolution
- request translation
- response normalization
- output URL generation
- cleanup logic

### Integration tests

Test against:

1. local `stable-diffusion.cpp` server on loopback
2. remote backend over Tailscale/LAN
3. invalid backend URL
4. backend timeout case
5. malformed backend response case

### Manual UI tests

Validate:

- provider appears in selector
- model presets appear correctly
- advanced parameters are submitted
- generated images render in history/result panel
- generated image URLs remain reachable for the expected TTL

---

## Operational Notes

### Logging

Recommended structured log fields:

- request id
- provider `sdcpp`
- backend URL host
- model preset
- generation duration
- save path
- output URL
- error class/message

Do not log raw prompts or secrets unless explicitly intended for development builds.

### Cleanup

Generated images should not remain forever by default.

Recommended strategies:

- remove files older than `SDCPP_FILE_TTL_HOURS` during startup
- optionally run cleanup periodically on generation or on a timer

### Remote trust model

If the API connects to a remote backend, ensure that backend is trusted and privately reachable. Avoid exposing raw inference infrastructure directly to public clients.

---

## Implementation Order

Follow this order to reduce rework:

1. add config/env support for `sdcpp`
2. add `sdcpp` channel registration
3. implement backend request adapter
4. implement response normalization and local file save
5. expose `/generated/*` file serving route
6. add static model preset entries
7. wire provider/model visibility into frontend
8. test local same-machine mode
9. test remote backend mode
10. add advanced controls and polish

---

## Acceptance Criteria for v1

The implementation is complete for v1 when all of the following are true:

- the app exposes `stable-diffusion.cpp` as a selectable provider
- at least one model preset is available
- a prompt can be submitted from the existing UI
- the API forwards generation to a configured `stable-diffusion.cpp` server
- the generated image is saved and served by `apps/api`
- the frontend receives a valid URL response and displays the image
- the integration works with both local and remote backend base URLs
- common failure cases return clear errors

---

## Final Recommendation

Implement `stable-diffusion.cpp` as a first-class provider channel named `sdcpp` inside the existing API abstraction.

This is the lowest-risk path because it:

- reuses the current UI and API contract
- supports both local and remote inference cleanly
- avoids frontend fragmentation
- keeps future support for multiple backends open

Once the text-to-image path is stable, additional capabilities such as img2img and richer backend controls can be layered in without changing the overall architecture.
