import { CheckInsClient } from '../../../../src/server/check-ins-manager/client';
import { CheckIn } from '../../../../src/server/check-ins-manager/check-in';
import { nullLogger } from '../../helpers';
import nock from 'nock';
import { ServerTransport } from '../../../../src/server/transport';

describe('CheckinsClient', () => {
  it('should create a client', () => {
    const client = new CheckInsClient({
      logger: nullLogger(),
      appEndpoint: 'https://app.honeybadger.io',
      apiKey: 'hbp_123',
      personalAuthToken: '123',
    }, new ServerTransport())
    expect(client).toBeInstanceOf(CheckInsClient)
  })

  it('should get project id from an api key', async () => {
    const request = nock('https://app.honeybadger.io')
      .get('/v2/project_keys/hbp_123')
      .reply(200, {
        project: {
          id: '11111',
          name: 'a project',
        }
      })

    const client = new CheckInsClient({
      logger: nullLogger(),
      appEndpoint: 'https://app.honeybadger.io',
      apiKey: 'hbp_123',
      personalAuthToken: '123',
    }, new ServerTransport())
    const projectId = await client.getProjectId('hbp_123')
    expect(request.isDone()).toBe(true)
    expect(projectId).toEqual('11111')
  })

  it('should list check-ins for a project', async () => {
    const projectId = '11111'
    const request = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins`)
      .reply(200, {
        results: [
          {
            id: 'uuid',
            slug: 'a-check-in',
            schedule_type: 'simple',
            report_period: '1 week',
          }
        ]
      })
    const client = new CheckInsClient({
      logger: nullLogger(),
      appEndpoint: 'https://app.honeybadger.io',
      apiKey: 'hbp_123',
      personalAuthToken: '123',
    }, new ServerTransport())
    const checkIns = await client.listForProject(projectId)
    expect(request.isDone()).toBe(true)
    expect(checkIns).toHaveLength(1)
    expect(checkIns[0].id).toEqual('uuid')
    expect(checkIns[0].slug).toEqual('a-check-in')
    expect(checkIns[0].scheduleType).toEqual('simple')
    expect(checkIns[0].reportPeriod).toEqual('1 week')
  })

  it('should get a check-in', async () => {
    const projectId = '11111'
    const checkInId = '22222'

    const request = nock('https://app.honeybadger.io')
      .get(`/v2/projects/${projectId}/check_ins/${checkInId}`)
      .once()
      .reply(200, {
        id: 'uuid',
        slug: 'a-check-in',
        schedule_type: 'simple',
        report_period: '1 week',
      })
    const client = new CheckInsClient({
      logger: nullLogger(),
      appEndpoint: 'https://app.honeybadger.io',
      apiKey: 'hbp_123',
      personalAuthToken: '123',
    }, new ServerTransport())
    const checkIn = await client.get(projectId, checkInId)
    expect(request.isDone()).toBe(true)
    expect(checkIn.id).toEqual('uuid')
    expect(checkIn.slug).toEqual('a-check-in')
    expect(checkIn.scheduleType).toEqual('simple')
    expect(checkIn.reportPeriod).toEqual('1 week')
  })

  it('should create a check-in', async () => {
    const projectId = '11111'
    const checkInId = '22222'

    const checkInToBeSaved = new CheckIn({
      slug: 'a-check-in',
      scheduleType: 'simple',
      reportPeriod: '1 week',
    })

    const payload = checkInToBeSaved.asRequestPayload()
    const request = nock('https://app.honeybadger.io')
      .post(`/v2/projects/${projectId}/check_ins`, { check_in: payload })
      .once()
      .reply(201, {
        id: checkInId,
        ...payload,
      })
    const client = new CheckInsClient({
      logger: nullLogger(),
      appEndpoint: 'https://app.honeybadger.io',
      apiKey: 'hbp_123',
      personalAuthToken: '123',
    }, new ServerTransport())
    const checkIn = await client.create(projectId, checkInToBeSaved)
    expect(request.isDone()).toBe(true)
    expect(checkIn.id).toEqual(checkInId)
    expect(checkIn.slug).toEqual('a-check-in')
    expect(checkIn.scheduleType).toEqual('simple')
    expect(checkIn.reportPeriod).toEqual('1 week')
  })

  it('should update a check-in', async () => {
    const projectId = '11111'
    const checkInId = '22222'

    const checkInToBeUpdated = new CheckIn({
      id: checkInId,
      slug: 'a-check-in',
      scheduleType: 'simple',
      reportPeriod: '1 week',
    })

    const payload = checkInToBeUpdated.asRequestPayload()
    const request = nock('https://app.honeybadger.io')
      .put(`/v2/projects/${projectId}/check_ins/${checkInId}`, { check_in: payload })
      .once()
      .reply(204, {
        id: checkInId,
        ...payload,
      })
    const client = new CheckInsClient({
      logger: nullLogger(),
      appEndpoint: 'https://app.honeybadger.io',
      apiKey: 'hbp_123',
      personalAuthToken: '123',
    }, new ServerTransport())
    const checkIn = await client.update(projectId, checkInToBeUpdated)
    expect(request.isDone()).toBe(true)
    expect(checkIn.id).toEqual(checkInId)
    expect(checkIn.slug).toEqual('a-check-in')
    expect(checkIn.scheduleType).toEqual('simple')
    expect(checkIn.reportPeriod).toEqual('1 week')
  })

  it('should remove a checkin', async () => {
    const projectId = '11111'
    const checkInId = '22222'

    const checkInToBeRemoved = new CheckIn({
      id: checkInId,
      slug: 'a-check-in',
      scheduleType: 'simple',
      reportPeriod: '1 week',
    })

    const request = nock('https://app.honeybadger.io')
      .delete(`/v2/projects/${projectId}/check_ins/${checkInId}`)
      .once()
      .reply(204)

    const client = new CheckInsClient({
      logger: nullLogger(),
      appEndpoint: 'https://app.honeybadger.io',
      apiKey: 'hbp_123',
      personalAuthToken: '123',
    }, new ServerTransport())

    await client.remove(projectId, checkInToBeRemoved)
    expect(request.isDone()).toBe(true)
  })
})
